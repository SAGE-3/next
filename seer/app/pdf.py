# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

#
# PDFAgent
#

import json, os
from logging import Logger
from typing import List

# SAGE3 API
from pysage3.client import PySage3

# AI
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

# from langchain_nvidia_ai_endpoints import ChatNVIDIA

# Web API
from fastapi import HTTPException

# Typing for RPC
from libs.localtypes import PDFQuery, PDFAnswer
from libs.utils import getModelsInfo, getPDFFile
from libs.llm_manager import LLMManager

# ChromaDB AI vector DB
import chromadb
from chromadb.config import Settings
from langchain_chroma import Chroma

# PDF
import pymupdf4llm
import pymupdf
from io import BytesIO

from libs.pdf.rag import generate_answer, make_reranker, NimEmbeddings
from libs.pdf.ocr import olmocr_to_markdown
from libs.utils import isValidPDFDocument, convertPDFToImages


# Minimum vector-store relevance score (0..1) for a chunk to be considered a
# real match. Chunks below this are dropped so an off-topic question retrieves
# nothing and falls back to full-text, instead of surfacing the nearest but
# irrelevant passages (which the model would answer from as if relevant).
RELEVANCE_THRESHOLD = 0.7


class PDFAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing PDFAgent")
        self.logger = logger
        self.ps3 = ps3
        # Capability-driven model registry (providers/tasks/settings)
        self.manager = LLMManager(getModelsInfo(ps3), logger)
        self.logger.info("PDF providers: " + ", ".join(self.manager.list_providers()))

        # Per-provider chat / vision models, built lazily on first use
        self._chat_models = {}
        self._vision_models = {}

        # Optional olmOCR service for PDF -> Markdown (models.pdf2md). When set,
        # it's the primary converter; pymupdf4llm remains the fallback.
        self.ocr = self.manager.ocr_config()
        if self.ocr:
            self.logger.info("PDF OCR: olmOCR " + self.ocr["model"])

        # Embeddings for the vector store: prefer a dedicated embedding NIM
        # (models.embed), otherwise fall back to a provider that has an
        # embeddings-capable model.
        embeddings = None
        emb = self.manager.embed_config()
        if emb:
            embeddings = NimEmbeddings(emb["url"], emb["model"], emb.get("apiKey"))
            self.logger.info("PDF embeddings: NIM " + emb["model"])
        else:
            for prov in [self.manager.default_provider()] + self.manager.list_providers():
                if prov and self.manager.has_capability(prov, "embeddings"):
                    embeddings = self.manager.build_embeddings(prov)
                    self.logger.info("PDF embeddings: provider " + prov)
                    break
        if embeddings is None:
            self.logger.error("PDFAgent> no embeddings configured")

        # Create the ChromaDB client
        chromaServer = "127.0.0.1"
        chromaPort = 8100
        mode = os.getenv("ENVIRONMENT")
        if mode == "production" or mode == "backend":
            chromaServer = "chromadb"
            chromaPort = 8000

        self.chroma = chromadb.HttpClient(
            # Local ChromaDB server - docker instance
            host=chromaServer,
            # Port changed to 8100 to avoid conflicts with other services
            port=chromaPort,
            # Authorization
            settings=Settings(
                # http basic auth scheme
                chroma_client_auth_provider="chromadb.auth.basic_authn.BasicAuthClientProvider",
                # credentials for the basic auth scheme loaded from .env file
                chroma_client_auth_credentials=os.getenv(
                    "CHROMA_CLIENT_AUTH_CREDENTIALS"
                ),
            ),
        )

        # Langchain Chroma
        self.vector_store = Chroma(
            client=self.chroma,
            collection_name="pdf_docs",
            embedding_function=embeddings,
        )

        # Using Langchain's Chromadb
        # Heartbeat to check the connection
        self.chroma.heartbeat()

    def _get_chat(self, provider: str):
        """Chat-capable model for a provider (lazy, cached). None if unable."""
        if provider in self._chat_models:
            return self._chat_models[provider]
        llm = self.manager.build_chat_model(provider, ["chat"])
        self._chat_models[provider] = llm
        return llm

    def _get_vision(self, provider: str):
        """Vision-capable model for a provider (lazy, cached). None if unable."""
        if provider in self._vision_models:
            return self._vision_models[provider]
        llm = self.manager.build_chat_model(provider, ["vision"])
        self._vision_models[provider] = llm
        return llm

    def getMDfromPDFWithImages(self, id, content, model):
        """
        Converts a PDF content to Markdown format and caches the result in a temporary file.

        Args:
          id (str): A unique identifier for the PDF content.
          content (bytes): The binary content of the PDF file.
          model (str): llm model to use for processing.

        Returns:
          str: The Markdown representation of the PDF content.

        If the Markdown file already exists in the temporary directory, it reads and returns the content from the file.
        Otherwise, it converts the PDF content to Markdown, writes it to a temporary file, and returns the Markdown content.
        """
        file_path = f"/tmp/{id}.md"
        if os.path.exists(file_path):
            with open(file_path, "r") as file:
                return file.read()
        else:
            document = pymupdf.open(stream=BytesIO(content), filetype="pdf")
            md = ""
            if isValidPDFDocument(document):
                md = pymupdf4llm.to_markdown(
                    pymupdf.open(stream=BytesIO(content), filetype="pdf"),
                    write_images=False,
                    embed_images=False,
                    # speed up the process by skipping complex pages
                    graphics_limit=500,
                    show_progress=True,
                )
                with open(file_path, "w") as file:
                    file.write(md)
            else:
                print("\n\n Convert to images \n\n")
                images = convertPDFToImages(document)
                print("\n\n Images: ", len(images), "\n\n")
                pages = []

                for i, image in enumerate(images):
                    pages.append(self.send_pdf_image_to_llm(image, i, model))

                pages.sort(key=lambda x: x["index"])
                md = "\n\n".join(page["content"] for page in pages)
                with open(file_path, "w") as file:
                    file.write(md)

            return md

    def send_pdf_image_to_llm(self, page_base64, page_num, model):
        messages: List[BaseMessage] = []
        messages.append(
            SystemMessage(
                content="""
            You are a helpful optical character recognition assistant
            - Read the page an extract all of the text in Markdown format
            - Do not wrap it in a code block
            - Only return the text that you have read
            - Do not make any information up
          """
            )
        )
        messages.append(
            HumanMessage(
                content=[
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{page_base64}"},
                    }
                ]
            )
        )

        llm = self._get_vision(model)
        if llm is None:
            raise ValueError(
                f"Provider '{model}' has no model capable of vision (PDF OCR)"
            )
        response = llm.invoke(messages)
        return {"index": page_num, "content": str(response.content)}

    async def _get_markdown(self, id, content, model):
        """PDF -> Markdown, cached in /tmp/{id}.md. Prefers olmOCR (models.pdf2md)
        and falls back to pymupdf4llm (with vision-OCR) if it's unset or fails."""
        file_path = f"/tmp/{id}.md"
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                return f.read()

        if self.ocr:
            try:
                md = await olmocr_to_markdown(
                    content, self.ocr["url"], self.ocr["model"], logger=self.logger
                )
                if md and md.strip():
                    with open(file_path, "w") as f:
                        f.write(md)
                    return md
                self.logger.error("olmOCR returned empty output; falling back")
            except Exception as e:
                self.logger.error(f"olmOCR failed ({e}); falling back to pymupdf4llm")

        # Fallback path (also handles the /tmp cache + image OCR internally)
        return self.getMDfromPDFWithImages(id, content, model)

    async def process(self, qq: PDFQuery):
        self.logger.info(
            "Got PDF> from " + qq.user + ": " + qq.q + " using: " + qq.model
        )

        self.logger.info(f"\n\nqq, {qq}\n\n")

        text = ""
        if qq.assetids:
            # Index each document once. Already-indexed docs are skipped entirely
            # (no fetch, no conversion, no re-embed) so repeat questions in a
            # session only pay for retrieval + answering.
            for assetid in qq.assetids:
                already = (
                    len(
                        self.vector_store.get(where={"sage_asset_id": assetid})[
                            "documents"
                        ]
                    )
                    > 0
                )
                if already:
                    self.logger.info(f"pdf {assetid}: already indexed, skipping")
                    continue

                # First time we see this doc: fetch -> markdown -> chunk -> embed
                content = getPDFFile(self.ps3, assetid)
                md = await self._get_markdown(assetid, content, qq.model)
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000, chunk_overlap=200
                )
                splits = splitter.split_documents(
                    [Document(md, metadata={"sage_asset_id": assetid})]
                )
                # Record chunk order so the full document can be reconstructed
                for i, d in enumerate(splits):
                    d.metadata["chunk_index"] = i
                res = await self.vector_store.aadd_documents(documents=splits)
                self.logger.info(f"pdf {assetid}: indexed {len(res)} chunks")

            llm = self._get_chat(qq.model)
            if llm is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Provider '{qq.model}' has no model capable of chat (PDF)",
                )

            # Chat model context window (used for summary stuffing) + reranker
            info = self.manager.resolve_model(qq.model, ["chat"]) or {}
            context_window = info.get("context_window") or 8000
            rr = self.manager.rerank_config()
            rerank = (
                make_reranker(rr["url"], rr["model"], rr.get("apiKey")) if rr else None
            )

            # Retrieve PER DOCUMENT so every selected PDF is represented — a
            # single global top-k can be dominated by one document, which is why
            # cross-document questions ("common topics in the 2 papers") failed.
            # Each document's candidates are reranked independently, then merged.
            async def retrieve(query: str):
                n = max(1, len(qq.assetids))
                keep = 5 if n == 1 else max(2, 8 // n)
                fetch = max(keep * 3, 12)
                results = []
                for aid in qq.assetids:
                    scored = await self.vector_store.asimilarity_search_with_relevance_scores(
                        query, k=fetch, filter={"sage_asset_id": aid}
                    )
                    # Keep only chunks that clear the relevance floor; below it we
                    # treat retrieval as empty so generate_answer falls back to
                    # full-text rather than answering from irrelevant passages.
                    docs = [doc for doc, score in scored if score >= RELEVANCE_THRESHOLD]
                    docs = rerank(query, docs, keep) if rerank else docs[:keep]
                    results.extend(docs)
                return results

            # Reconstruct full document text from the indexed chunks, grouped and
            # labeled per document. Used for broad questions and empty retrieval.
            def get_full_text() -> str:
                stored = self.vector_store.get(
                    where={"sage_asset_id": {"$in": qq.assetids}}
                )
                docs = stored.get("documents") or []
                metas = stored.get("metadatas") or []
                by_doc: dict = {}
                for meta, doc in zip(metas, docs):
                    aid = (meta or {}).get("sage_asset_id", "")
                    by_doc.setdefault(aid, []).append(
                        ((meta or {}).get("chunk_index", 0), doc)
                    )
                sections = []
                for i, aid in enumerate(qq.assetids):
                    chunks = sorted(by_doc.get(aid, []), key=lambda p: p[0])
                    if chunks:
                        body = "\n\n".join(c for _, c in chunks)
                        sections.append(f"# Document {i + 1}\n\n{body}")
                return "\n\n".join(sections)

            # The head (first chunks) of each document — where title, authors and
            # abstract live — for structural/metadata questions.
            def get_head(n_per_doc: int = 2):
                stored = self.vector_store.get(
                    where={"sage_asset_id": {"$in": qq.assetids}}
                )
                docs = stored.get("documents") or []
                metas = stored.get("metadatas") or []
                by_doc: dict = {}
                for meta, doc in zip(metas, docs):
                    aid = (meta or {}).get("sage_asset_id", "")
                    by_doc.setdefault(aid, []).append(
                        ((meta or {}).get("chunk_index", 0), doc, meta or {})
                    )
                head = []
                for aid in qq.assetids:
                    first = sorted(by_doc.get(aid, []), key=lambda p: p[0])[:n_per_doc]
                    for _, doc, meta in first:
                        head.append(Document(page_content=doc, metadata=meta))
                return head

            answer = await generate_answer(
                qq=qq,
                llm=llm,
                retrieve=retrieve,
                get_full_text=get_full_text,
                get_head=get_head,
                context_window=context_window,
            )

            text = answer.strip()
            text = text + "\n\n---\n"
            text += "Text generated using an AI model [" + qq.model + "]\n"

        # Propose the answer to the user
        action1 = json.dumps(
            {
                "type": "create_app",
                "app": "Stickie",
                "state": {"text": text, "fontSize": 16, "color": "purple"},
                "data": {
                    "title": "Answer",
                    "position": {"x": qq.ctx.pos[0], "y": qq.ctx.pos[1], "z": 0},
                    "size": {"width": 400, "height": 500, "depth": 0},
                },
            }
        )

        # Build the answer object
        val = PDFAnswer(
            r=text,
            success=True,
            actions=[action1],
        )
        return val
