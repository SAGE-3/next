# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Image Agent

import json
from logging import Logger
import httpx

# Image
from PIL import Image
from io import BytesIO
import base64
from typing import List

# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3

# AI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage

from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI

# Typing for RPC
from libs.localtypes import ImageQuery, ImageAnswer
from libs.utils import getModelsInfo

# Downsized image size for processing by LLMs
ImageSize = 800

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


class ImageAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing ImageAgent")
        self.logger = logger
        self.ps3 = ps3
        models = getModelsInfo(ps3)
        llama = models["llama"]
        openai = models["openai"]
        # Llama model
        self.server = llama["url"]
        self.model = llama["model"]
        self.llm_llama = ChatNVIDIA(
            base_url=llama["url"] + "/v1",
            model=llama["model"],
            stream=False,
            max_tokens=1000,
        )
        self.httpx_client = httpx.Client(timeout=None)
        # OpenAI model
        if openai["apiKey"] and openai["model"]:
            self.llm_openai = ChatOpenAI(
                api_key=openai["apiKey"],
                # needs to be gpt-4o-mini or better, for image processing
                model=openai["model"],
            )

    async def process(self, qq: ImageQuery):
        self.logger.info("Got image> from " + qq.user + ": " + qq.q)
        description = "No description available."
        assets = self.ps3.s3_comm.get_assets()
        for f in assets:
            if f["_id"] == qq.asset:
                asset = f["data"]
                url = (
                    self.ps3.s3_comm.conf[self.ps3.s3_comm.prod_type]["web_server"]
                    + self.ps3.s3_comm.routes["get_static_content"]
                    + asset["file"]
                )
                headers = self.ps3.s3_comm._SageCommunication__headers
                r = self.ps3.s3_comm.httpx_client.get(url, headers=headers)
                if r.is_success:
                    img = Image.open(BytesIO(r.content))
                    width, height = img.size
                    img = img.resize((ImageSize, int(ImageSize / (width / height))))
                    buffered = BytesIO()
                    img.save(buffered, format="JPEG")
                    image_bytes = buffered.getvalue()
                    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

                    if qq.model == "llama":
                        data = {
                            "messages": [
                                {
                                    "role": "assistant",
                                    "content": "You are a helpful assistant, providing detailed  answers to the user, using the Markdown format.",
                                },
                                {
                                    "role": "user",
                                    "content": [
                                        {"type": "text", "text": qq.q},
                                        {
                                            "type": "image_url",
                                            "image_url": {
                                                "url": f"data:image/jpeg;base64,{image_base64}"
                                            },
                                            "detail": "high",
                                        },
                                    ],
                                },
                            ],
                        }
                        url = self.server + "/v1/chat/completions"
                        response = self.httpx_client.post(url, json=data)
                        if response.status_code == 200:
                            description = response.json()["choices"][0]["message"][
                                "content"
                            ]
                    elif qq.model == "openai":
                        messages: List[BaseMessage] = []
                        messages.append(
                            SystemMessage(
                                content="You are a helpful assistant, providing detailed  answers to the user, using the Markdown format."
                            )
                        )
                        messages.append(
                            HumanMessage(
                                content=[
                                    {"type": "text", "text": qq.q},
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/png;base64,{image_base64}"
                                        },
                                    },
                                ]
                            )
                        )
                        response = await self.llm_openai.ainvoke(messages)
                        description = str(response.content)
                else:
                    print("Failed to get image.", r)
                    description = "Failed to get image."
                break

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
        val = ImageAnswer(
            r=text,
            success=True,
            actions=[action1],
        )
        return val
