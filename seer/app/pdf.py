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
from typing import Dict, List

# SAGE3 API
from pysage3.client import PySage3

# AI
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

# from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI, AzureChatOpenAI

# Typing for RPC
from libs.localtypes import PDFQuery, PDFAnswer
from libs.utils import getModelsInfo, getPDFFile

# ChromaDB AI vector DB
import chromadb
from chromadb.config import Settings
from langchain_chroma import Chroma
from langchain_openai.embeddings import OpenAIEmbeddings
from langchain_openai import AzureOpenAIEmbeddings
from langchain.vectorstores.base import VectorStoreRetriever

# PDF
import pymupdf4llm
import pymupdf
from io import BytesIO

from libs.pdf.pdf_v3 import generate_answer
from libs.utils import isValidPDFDocument, convertPDFToImages


class PDFAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing PDFAgent")
        self.logger = logger
        self.ps3 = ps3
        models = getModelsInfo(ps3)

        openai = models["openai"]
        azure = models["azure"]

        # OpenAI model
        if openai["apiKey"] and openai["model"]:
            self.llm_openai = ChatOpenAI(
                api_key=openai["apiKey"],
                model=openai["model"],
                streaming=False,
            )
            # OpenAI embedding
            self.embedding_openai = OpenAIEmbeddings(api_key=openai["apiKey"])

        # Azure OpenAI model
        if azure["text"]["apiKey"] and azure["text"]["model"]:
            model = azure["text"]["model"]
            endpoint = azure["text"]["url"]
            credential = azure["text"]["apiKey"]
            api_version = azure["text"]["api_version"]

            self.llm_azure = AzureChatOpenAI(
                azure_deployment=model,
                api_version=api_version,
                azure_endpoint=endpoint,
                azure_ad_token=credential,
                model=model,
            )
            # Azure embedding
            model = azure["embedding"]["model"]
            endpoint = azure["embedding"]["url"]
            credential = azure["embedding"]["apiKey"]
            api_version = azure["embedding"]["api_version"]
            self.embedding_azure = AzureOpenAIEmbeddings(
                model=model,
                azure_endpoint=endpoint,
                api_key=credential,
                api_version=api_version,
            )

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
        if azure["embedding"]["apiKey"] and azure["embedding"]["model"]:
            self.vector_store = Chroma(
                client=self.chroma,
                collection_name="pdf_docs",
                embedding_function=self.embedding_azure,
            )
        else:
            self.vector_store = Chroma(
                client=self.chroma,
                collection_name="pdf_docs",
                embedding_function=self.embedding_openai,
            )

        # Using Langchain's Chromadb
        # Heartbeat to check the connection
        self.chroma.heartbeat()

    def _get_llm_for_model(self, model: str):
        """Return the configured text model for the requested provider."""

        if model == "openai" and hasattr(self, "llm_openai"):
            return self.llm_openai
        if model == "azure" and hasattr(self, "llm_azure"):
            return self.llm_azure
        return None

    def _normalize_pdf_text_pages(self, pages) -> List[str]:
        """Normalize cached PDF text payloads into a clean list of page strings."""

        if not isinstance(pages, list):
            return []

        normalized: List[str] = []
        for page in pages:
            if isinstance(page, str):
                text = page.strip()
                if text:
                    normalized.append(text)
                continue

            # Be defensive here because older processors or future variants may
            # wrap page text in small objects instead of returning raw strings.
            if isinstance(page, dict):
                for key in ("text", "content", "pageText"):
                    value = page.get(key)
                    if isinstance(value, str) and value.strip():
                        normalized.append(value.strip())
                        break

        return normalized

    def _get_cached_pdf_text(self, assetid: str) -> str:
        """
        Prefer the text extracted by homebase-files when it is available.

        This is both faster and more reliable than re-running the heavy PDF
        markdown/OCR pipeline during a SEER question.
        """

        try:
            asset_doc = self.ps3.s3_comm.get_asset(assetid)
        except Exception:
            self.logger.exception(
                "PDFAgent> failed to fetch asset document for cached PDF text: %s",
                assetid,
            )
            return ""

        if not isinstance(asset_doc, dict):
            if isinstance(asset_doc, list):
                asset_doc = next(
                    (item for item in asset_doc if isinstance(item, dict)),
                    {},
                )

        if not isinstance(asset_doc, dict):
            self.logger.warning(
                "PDFAgent> asset %s did not resolve to a document dict: %r",
                assetid,
                type(asset_doc),
            )
            return ""

        data = asset_doc.get("data", {})
        if not isinstance(data, dict):
            self.logger.warning(
                "PDFAgent> asset %s has unexpected data payload: %r",
                assetid,
                type(data),
            )
            return ""

        asset_path = data.get("path") or data.get("file")
        if not isinstance(asset_path, str) or not asset_path:
            return ""

        try:
            pages = self.ps3.s3_comm.get_pdf_text(asset_path)
        except Exception:
            self.logger.exception(
                "PDFAgent> failed to fetch cached PDF text for asset %s",
                assetid,
            )
            return ""

        return "\n\n".join(self._normalize_pdf_text_pages(pages))

    def _extract_plain_text_from_pdf(self, content: bytes) -> str:
        """
        Extract plain text directly from the PDF before falling back to OCR.

        This avoids the more complex markdown/layout pipeline for documents
        whose text content is already embedded cleanly in the file.
        """

        document = pymupdf.open(stream=BytesIO(content), filetype="pdf")
        pages: List[str] = []

        for page_num in range(document.page_count):
            page = document[page_num]
            text = page.get_text("text")
            if isinstance(text, str) and text.strip():
                pages.append(text.strip())

        return "\n\n".join(pages)

    def _get_pdf_text_content(self, assetid: str, content: bytes, model: str) -> str:
        """
        Build the most reliable textual representation we can for a PDF asset.

        Order of preference:
        1. cached text generated by the files service
        2. direct plain-text extraction with PyMuPDF
        3. markdown / OCR fallback for hard PDFs
        """

        cached_text = self._get_cached_pdf_text(assetid)
        if cached_text.strip():
            return cached_text

        try:
            plain_text = self._extract_plain_text_from_pdf(content)
            if plain_text.strip():
                return plain_text
        except Exception:
            self.logger.exception(
                "PDFAgent> plain-text extraction failed for asset %s; falling back to markdown/OCR",
                assetid,
            )

        return self.getMDfromPDFWithImages(assetid, content, model)

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

        The /tmp cache is intentionally opportunistic: it keeps follow-up SEER
        questions fast, but it is not treated as durable production storage.
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
                self.logger.info("PDFAgent> PDF %s needs OCR fallback; converting pages to images", id)
                images = convertPDFToImages(document)
                self.logger.info("PDFAgent> OCR fallback produced %s page image(s) for %s", len(images), id)
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

        if model == "openai":
            response = self.llm_openai.invoke(messages)
        elif model == "azure":
            response = self.llm_azure.invoke(messages)
        else:
            raise ValueError(f"Unsupported model: {model}")
        return {"index": page_num, "content": str(response.content)}

    async def summarize_pdf_direct(self, qq: PDFQuery, assetid: str) -> str:
        """
        Fall back to a simple direct PDF summary path when the richer PDF RAG flow fails.

        This keeps SEER useful for common prompts like "what is this PDF about?"
        even if Chroma, retrieval, or the graph-based flow has an issue.
        """

        llm = self._get_llm_for_model(qq.model)
        if llm is None:
            raise ValueError(f"Unsupported model: {qq.model}")

        pdf_content = getPDFFile(self.ps3, assetid)
        if not pdf_content:
            raise ValueError(f"Unable to load PDF asset {assetid}.")

        text_content = self._get_pdf_text_content(assetid, pdf_content, qq.model)
        excerpt = text_content[:16000]
        if not excerpt.strip():
            raise ValueError(f"PDF asset {assetid} did not yield readable content.")

        messages: List[BaseMessage] = [
            SystemMessage(
                content="""
                You are a concise document analysis assistant.
                Answer using only the provided PDF content excerpt.
                If the excerpt is not enough to answer confidently, say so plainly.
                Always use valid Markdown.
                """
            ),
            HumanMessage(
                content=f"User question: {qq.q}\n\nPDF content excerpt:\n{excerpt}"
            ),
        ]

        response = await llm.ainvoke(messages)
        return str(response.content)

    async def process(self, qq: PDFQuery):
        self.logger.info(
            "Got PDF> from " + qq.user + ": " + qq.q + " using: " + qq.model
        )

        pdfContents = [
            {"id": assetid, "content": getPDFFile(self.ps3, assetid)}
            for assetid in qq.assetids
        ]

        self.logger.info(f"pdfs: {len(pdfContents)}")
        self.logger.info(
            f"pdf: {pdfContents[0]['id']}, {len(pdfContents[0]['content'])}"
        )

        self.logger.info(f"\n\nqq, {qq}\n\n")

        # Used to filter documents in the vector DB
        #   using an array to accomodate for more than 1 pdf in the future
        sage_asset_ids = qq.assetids

        # Create retrievers for each document
        retrievers: Dict[str, VectorStoreRetriever] = {
            sage_asset_id: self.vector_store.as_retriever(
                search_type="similarity_score_threshold",
                search_kwargs={
                    "filter": {"sage_asset_id": sage_asset_id},
                    "score_threshold": 0.7,
                },
            )
            for sage_asset_id in sage_asset_ids
        }

        self.logger.info(f"sage retrievers: {retrievers}")

        if len(pdfContents) > 0:
            # Today SEER lazily adds missing embeddings on first question. We
            # should eventually move this work to upload/preprocessing time so
            # the first interactive PDF question is lighter in production.

            # Convert PDFs to markdown
            pdfs_to_md = {
                pdf["id"]: self._get_pdf_text_content(pdf["id"], pdf["content"], qq.model)
                for pdf in pdfContents
            }

            self.logger.info(f"pdfs_to_md, {pdfs_to_md.keys()}")

            for assetid in qq.assetids:
                # If asset id is not in vector store, add it
                if (
                    len(
                        self.vector_store.get(where={"sage_asset_id": assetid})[
                            "documents"
                        ]
                    )
                    == 0
                ):
                    self.logger.info("PDFAgent> adding missing embeddings for PDF %s to Chroma", assetid)
                    text_splitter = RecursiveCharacterTextSplitter(
                        chunk_size=1000, chunk_overlap=200
                    )

                    splits = text_splitter.split_documents(
                        [
                            Document(
                                pdfs_to_md[assetid],
                                metadata={
                                    "sage_asset_id": assetid,
                                },
                            )
                        ]
                    )

                    res = await self.vector_store.aadd_documents(documents=splits)

                    self.logger.info("PDFAgent> stored %s PDF chunk(s) for %s", len(res), assetid)

            if qq.model == "openai":
                answer = await generate_answer(
                    qq=qq,
                    llm=self.llm_openai,
                    retrievers=retrievers,
                    markdown_files_dict=pdfs_to_md,
                )
            elif qq.model == "azure":
                answer = await generate_answer(
                    qq=qq,
                    llm=self.llm_azure,
                    retrievers=retrievers,
                    markdown_files_dict=pdfs_to_md,
                )
            else:
                raise ValueError(f"Unsupported model: {qq.model}")

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
