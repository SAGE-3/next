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
from io import StringIO
import io
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

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
from libs.localtypes import CSVQuery, CSVAnswer
from libs.utils import getModelsInfo, getCSVFile

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
from libs.csv.csv import generate_answer

class CSVAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing CSVAgent")
        self.logger = logger
        self.ps3 = ps3
        models = getModelsInfo(ps3)
        llama = models["llama"]
        openai = models["openai"]
        # Llama model
        self.server = llama["url"]
        self.model = llama["model"]
        self.llm_openai = 0
        # Llama model
        if llama["url"] and llama["model"]:
            self.llm_llama = ChatNVIDIA(
                base_url=llama["url"] + "/v1",
                model=llama["model"],
                stream=False,
                max_tokens=1000,
            )
        # OpenAI model
        # if openai["apiKey"] and openai["model"]:

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
          collection_name="csv_docs",
          embedding_function=self.embedding_model
        )

        # Using Langchain's Chromadb
        # Heartbeat to check the connection
        self.chroma.heartbeat()

    async def process(self, qq: CSVQuery):
        self.logger.info("Got CSV> from " + qq.user + ": " + qq.q)
        # Default answer
        description = "No description available."
        # Retrieve the PDF content
        # TODO: make cleaner
        # Define the loop to run getPDFFile in an executor for each asset
        # loop = asyncio.get_event_loop()
        
        # # Use run_in_executor for each asset ID to avoid blocking the event loop
        # pdfContents = [
        #     {
        #         "id": assetid,
        #         "content": await loop.run_in_executor(None, getPDFFile, self.ps3, assetid)
        #     }
        #     for assetid in qq.assetids
        # ]
        csvContents = [
            {
                "id": assetid,
                "content": getCSVFile(self.ps3, assetid).decode("utf-8")  # Decode bytes to string
            }
            for assetid in qq.assetids
        ]
        print(csvContents)
        csv_item = csvContents[0]
        # for csv_item in csvContents:
        
        # Parse csvContents
        asset_id = csv_item["id"]
        csv_data = csv_item["content"]  # Extract the CSV string
        csv_buffer = StringIO(csv_data)  # Wrap string in StringIO
        df = pd.read_csv(csv_buffer)  # Automatically infer columns from the first row
        print(f"DataFrame for id {csv_item['id']}:\n", df)
        
        # Display the DataFrame
        print(f"Asset ID: {asset_id}")
        print(df)
        # self.logger.info(f"pdfs: {len(df)}")
        # self.logger.info(f"csv: {df[0]}, {len(df[0])}")
        
        # self.logger.info(f"\n\nqq, {qq}\n\n")

        # # Used to filter documents in the vector DB
        # sage_asset_ids = qq.assetids # array to accomodate for more than 1 pdf in the future
        
        # # Create retrievers for each document
        # retrievers: Dict[str, VectorStoreRetriever] = {
        #     sage_asset_id: self.vector_store.as_retriever(
        #         search_type="similarity_score_threshold",
        #         search_kwargs={
        #             "filter": {"sage_asset_id": sage_asset_id},
        #             "score_threshold": 0.7
        #         },
        #     )
        #     for sage_asset_id in sage_asset_ids
        # }
        
        if len(csvContents) > 0:

            answer = await generate_answer(
              qq=qq,
              llm=self.llm_openai,
              df=df
            )

        # text = answer

        # # Propose the answer to the user
        # action1 = json.dumps(
        #     {
        #         "type": "create_app",
        #         "app": "Image",
        #         "state": {"text": text, "fontSize": 16, "color": "purple"},
        #         "data": {
        #             "title": "Answer",
        #             "position": {"x": qq.ctx.pos[0], "y": qq.ctx.pos[1], "z": 0},
        #             "size": {"width": 400, "height": 500, "depth": 0},
        #         },
        #     }
        # )
        print(answer)
        code = """
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(6, 4))
plt.plot(x, y, label='sin(x)')
plt.title('Sin(x) Plot')
plt.legend()
"""
        
        exec(code)
        
        # Save the generated plot to a BytesIO object
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()  # Close the plot to prevent reusing it
        buf.seek(0)

        # Build the answer object
        val = CSVAnswer.from_buffer(buf, success=True, actions=[])

        return val
