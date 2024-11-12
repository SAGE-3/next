# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# PDFAgent
import json, os
from logging import Logger
import asyncio

# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3

# AI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

# from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI

# Typing for RPC
from libs.localtypes import PDFQuery, PDFAnswer
from libs.utils import getModelsInfo, getPDFFiles

# ChromaDB AI vector DB
import chromadb
from chromadb.config import Settings
from langchain_chroma import Chroma
from langchain_openai.embeddings import OpenAIEmbeddings

# PDF
import pymupdf4llm
import pymupdf
from io import BytesIO

from langchain.vectorstores.base import VectorStoreRetriever
from typing import Dict

# from libs.pdf.pdf_utils import generate_answer
from libs.pdf.pdf_v3 import generate_answer

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
        llama = models["llama"]
        openai = models["openai"]
        # Llama model
        self.server = llama["url"]
        self.model = llama["model"]
        # Llama model
        if llama["url"] and llama["model"]:
            self.llm_llama = ChatNVIDIA(
                base_url=llama["url"] + "/v1",
                model=llama["model"],
                stream=False,
                max_tokens=1000,
            )
        # OpenAI model
        if openai["apiKey"] and openai["model"]:
            self.llm_openai = ChatOpenAI(
                api_key=openai["apiKey"],
                model=openai["model"],
                max_tokens=1000,
                streaming=False,
            )
        # Create the ChromaDB client
        chromaServer = "127.0.0.1"
        chromaPort = 8100
        if os.getenv("ENVIRONMENT") == "production":
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

        # OpenAI for now, can explore more in the future
        self.embedding_model = OpenAIEmbeddings(api_key=openai["apiKey"])

        # Langchain Chroma 
        self.vector_store = Chroma(
          client=self.chroma,
          collection_name="pdf_docs",
          embedding_function=self.embedding_model
        )

        # Using Langchain's Chromadb
        # Heartbeat to check the connection
        self.chroma.heartbeat()

    async def process(self, qq: PDFQuery):
        self.logger.info("Got PDF> from " + qq.user + ": " + qq.q)
        # Default answer
        description = "No description available."
        # Retrieve the PDF content
        # TODO: make cleaner
        # Define the loop to run getPDFFiles in an executor for each asset
        loop = asyncio.get_event_loop()
        
        # Use run_in_executor for each asset ID to avoid blocking the event loop
        pdfContents = [
            {
                "id": assetid,
                "content": await loop.run_in_executor(None, getPDFFiles, self.ps3, assetid)
            }
            for assetid in qq.assetids
        ]
    
        
        self.logger.info(f"pdfs: {len(pdfContents)}")
        self.logger.info(f"pdf: {pdfContents[0]['id']}, {len(pdfContents[0]['content'])}")
        
        pdfContent = getPDFFiles(self.ps3, qq.assetids[0])
        self.logger.info(f"\n\nqq, {qq}\n\n")

        # Used to filter documents in the vector DB
        sage_asset_ids = qq.assetids # array to accomodate for more than 1 pdf in the future
        # sage_asset_filter = {"sage_asset_id": {"$in": sage_asset_ids}}
        # Retriever is used to get documents from Chroma
        # retriever = self.vector_store.as_retriever(
        #   search_type="similarity_score_threshold",
        #   search_kwargs={"filter": sage_asset_filter, "score_threshold": 0.7}
        # )
        
        retrievers: Dict[str, VectorStoreRetriever] = {
            sage_asset_id: self.vector_store.as_retriever(
                search_type="similarity_score_threshold",
                search_kwargs={
                    "filter": {"sage_asset_id": sage_asset_id},
                    "score_threshold": 0.7
                },
            )
            for sage_asset_id in sage_asset_ids
        }
        
        self.logger.info(f"sage retrievers: {retrievers}")

        if pdfContent:
            # TODO: For now doing the document processing here will need to create endpoint for that. Upon uploading, embeddings should be created and stored in chromadb
            pdf_stream = BytesIO(pdfContent)
            pdf_document = pymupdf.open(stream=pdf_stream, filetype="pdf")
            # TODO: Check token length for context length limits on long documents
            pdfs_to_md = {
              pdf["id"]: await loop.run_in_executor(
                None, pymupdf4llm.to_markdown, pymupdf.open(stream=BytesIO(pdf["content"]), filetype="pdf")
              )
              for pdf in pdfContents
            }
            self.logger.info(f"pdfs_to_md, {pdfs_to_md.keys()}")
            self.logger.info(f"pdf_to_md key value, {pdfs_to_md['0b29bdc5-ccc7-4de7-ba94-969609dba8f9']}")
            md = pymupdf4llm.to_markdown(pdf_document)
            
            if len(self.vector_store.get(where={"sage_asset_id": qq.assetids[0]})["documents"]) == 0:
              print("\n\nadding to chroma\n\n")
              text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
              )

              splits = text_splitter.split_documents([Document(md, metadata={
                "sage_asset_id": qq.assetids[0],
              })])
              
              res = await self.vector_store.aadd_documents(documents=splits)

              print(f"\n\ndocument splits: {len(res)}\n\n")
            
            answer = await generate_answer(
              qq=qq,
              llm=self.llm_openai,
              retrievers=retrievers,
              markdown_files_dict=pdfs_to_md
            )

        text = answer

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
