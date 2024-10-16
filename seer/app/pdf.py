# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# PDFAgent

import json
from logging import Logger
import httpx

# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3

# AI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage

# from langchain_nvidia_ai_endpoints import ChatNVIDIA

# Typing for RPC
from libs.localtypes import PDFQuery, PDFAnswer

# Templates
sys_template_str = "Today is {date}. You are a helpful and succinct assistant, providing informative answers to {username}."
human_template_str = "Describe the following image."


# For OpenAI / Message API compatible models
prompt = ChatPromptTemplate.from_messages(
    messages=[
        SystemMessage(content=sys_template_str),
        HumanMessage(content=human_template_str),
        HumanMessagePromptTemplate.from_template(
            [
                {
                    "image_url": {
                        "url": "data:image/jpeg;base64,{image_base64}",
                        "detail": "high",
                    }
                }
            ]
        ),
    ]
)

# OutputParser that parses LLMResult into the top likely string.
# Create a new model by parsing and validating input data from keyword arguments.
# Raises ValidationError if the input data cannot be parsed to form a valid model.
output_parser = StrOutputParser()


class PDFAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing PDFAgent")
        self.logger = logger
        self.ps3 = ps3
        self.server = "https://arcade.evl.uic.edu/llama32-11B-vision/"
        self.model = ("/data/11Bf",)
        self.httpx_client = httpx.Client(timeout=None)

    async def process(self, qq: PDFQuery):
        self.logger.info("Got PDF> from " + qq.user + ": " + qq.q)
        # Default answer
        description = "No description available."
        # Get the assets
        assets = self.ps3.s3_comm.get_assets()
        # Find the asset in question
        for f in assets:
            if f["_id"] == qq.asset:
                asset = f["data"]
                # Build the URL
                url = (
                    self.ps3.s3_comm.conf[self.ps3.s3_comm.prod_type]["web_server"]
                    + self.ps3.s3_comm.routes["get_static_content"]
                    + asset["file"]
                )
                # Get the authorization headers
                headers = self.ps3.s3_comm._SageCommunication__headers
                # Download the PDF
                r = self.ps3.s3_comm.httpx_client.get(url, headers=headers)
                if r.is_success:
                    pdf_content = r.content
                    ## Do something with the PDF content
                    description = f"PDF content retrieved: {len(pdf_content)} bytes"

        text = description

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
