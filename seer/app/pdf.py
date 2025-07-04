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
from foresight.Sage3Sugar.pysage3 import PySage3

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

        if model == "openai":
            response = self.llm_openai.invoke(messages)
        elif model == "azure":
            response = self.llm_azure.invoke(messages)
        else:
            raise ValueError(f"Unsupported model: {model}")
        return {"index": page_num, "content": str(response.content)}

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
            # TODO: For now doing the document processing here will need to create endpoint for that. Upon uploading, embeddings should be created and stored in chromadb
            # TODO: Check token length for context length limits on long documents

            # Convert PDFs to markdown
            pdfs_to_md = {
                pdf["id"]: self.getMDfromPDFWithImages(
                    pdf["id"], pdf["content"], qq.model
                )
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
                    print("\n\nadding to chroma\n\n")
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

                    print(f"\n\ndocument splits: {len(res)}\n\n")

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
