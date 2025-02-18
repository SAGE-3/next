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
from io import BytesIO
import base64, requests
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
from libs.utils import getModelsInfo, getImageFile, scaleImage, isURL, isDataURL

# Downsized image size for processing by LLMs
ImageSize = 600


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
        # Llama model
        if llama["url"] and llama["model"]:
            self.llm_llama = ChatNVIDIA(
                base_url=llama["url"] + "/v1",
                model=llama["model"],
                stream=False,
                max_tokens=1500,
            )
        self.httpx_client = httpx.Client(timeout=None)
        # OpenAI model
        if openai["apiKey"] and openai["model"]:
            self.llm_openai = ChatOpenAI(
                api_key=openai["apiKey"],
                # needs to be gpt-4o-mini or better, for image processing
                model=openai["model"],
                # max_tokens=1000,
                streaming=False,
            )

    async def process(self, qq: ImageQuery):
        self.logger.info("Got image> from " + qq.user + ": " + qq.q + " - " + qq.model)
        description = "No description available."

        if isDataURL(qq.asset):
            # Load an image from a base64 encoded data URL
            imageContent = BytesIO(base64.b64decode(qq.asset.split(",")[1])).getbuffer()
        elif isURL(qq.asset):
            # Fetch and load an image from a URL
            response = requests.get(qq.asset)
            imageContent = BytesIO(response.content).getbuffer()
        else:
            # Retrieve the image content from SAGE3
            imageContent = getImageFile(self.ps3, qq.asset)

        if imageContent:
            # Scale the image to the desired size
            image_bytes = scaleImage(imageContent, ImageSize)
            # Convert the image to base64
            image_base64 = base64.b64encode(image_bytes).decode("utf-8")

            if qq.model == "llama":
                data = {
                    "model": self.model,
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
                print(response)
                if response.status_code == 200:
                    description = response.json()["choices"][0]["message"]["content"]
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
            description = "Failed to get image."

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
