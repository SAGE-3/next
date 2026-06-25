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
from pysage3.client import PySage3

# AI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage

# Typing for RPC
from libs.localtypes import ImageQuery, ImageAnswer
from libs.utils import (
    getModelsInfo,
    getImageFile,
    scaleImage,
    isURL,
    isDataURL,
    parse_openai_error,
)
from libs.llm_manager import LLMManager

# AI logging
from libs.ai_logging import ai_logger, LoggingLLMHandler

# Handler in Langchain to log the AI prompt
ai_handler = LoggingLLMHandler("image")

# Downsized image size for processing by LLMs
ImageSize = 800

sys_template_str = """You are a helpful and succinct assistant, providing informative answers.
  Always format your responses using valid Markdown syntax. Use appropriate elements like:
  •	# for headings
  •	**bold** or _italic_ for emphasis
  •	`inline code` and code blocks (...) for code
  •	Bullet lists, numbered lists, and links as needed
  If you include code, always wrap it in fenced code blocks with the correct language tag (e.g., ```python). Default to Python if no language is specified. If asked to create plots, please use Matplotlib. .
  If you don't know the answer, say "I don't know" and suggest to search the web."""


class ImageAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing ImageAgent")
        self.logger = logger
        self.ps3 = ps3
        # Capability-driven model registry (providers/tasks/settings)
        self.manager = LLMManager(getModelsInfo(ps3), logger)
        self.logger.info("Image providers: " + ", ".join(self.manager.list_providers()))
        self.httpx_client = httpx.Client(timeout=None)
        # Per-provider vision models, built lazily on first use
        self._models = {}

        ai_logger.emit(
            "init",
            {
                "agent": "image",
                "providers": self.manager.list_providers(),
            },
        )

    def _get_model(self, provider: str):
        """Build (and cache) a vision-capable model for a provider.
        Returns None if the provider has no model that can process images."""
        if provider in self._models:
            return self._models[provider]
        llm = self.manager.build_chat_model(provider, ["vision"])
        self._models[provider] = llm
        return llm

    def _load_image_b64(self, asset: str):
        """Fetch an image (SAGE3 asset id, URL, or data URL), scale it, and
        return base64, or None if it can't be loaded."""
        if isDataURL(asset):
            imageContent = BytesIO(base64.b64decode(asset.split(",")[1])).getbuffer()
        elif isURL(asset):
            response = requests.get(asset)
            imageContent = BytesIO(response.content).getbuffer()
        else:
            imageContent = getImageFile(self.ps3, asset)
        if not imageContent:
            return None
        return base64.b64encode(scaleImage(imageContent, ImageSize)).decode("utf-8")

    async def process(self, qq: ImageQuery):
        self.logger.info(
            "Got image> from "
            + qq.user
            + ": "
            + qq.q
            + " - "
            + qq.model
            + " ("
            + str(len(qq.assets))
            + " image(s))"
        )
        description = "No description available."
        success = True

        # Load every selected image
        image_b64s = [b for b in (self._load_image_b64(a) for a in qq.assets) if b]

        if image_b64s:
            # Save the ai name and prompt for the logs
            ai_handler.setAI(qq.model)
            ai_handler.setPrompt(qq.q)

            # Resolve a vision-capable model for the requested provider
            llm = self._get_model(qq.model)
            if llm is None:
                from fastapi import HTTPException

                raise HTTPException(
                    status_code=400,
                    detail=f"Provider '{qq.model}' has no model capable of vision",
                )

            # One message with the question followed by every image. When there
            # are several, label them so the model can refer to / compare them.
            multiple = len(image_b64s) > 1
            content = [{"type": "text", "text": qq.q}]
            for i, b64 in enumerate(image_b64s):
                if multiple:
                    content.append({"type": "text", "text": f"Image {i + 1}:"})
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64}"},
                    }
                )

            messages: List[BaseMessage] = [
                SystemMessage(content=sys_template_str),
                HumanMessage(content=content),
            ]
            try:
                response = await llm.ainvoke(
                    messages,
                    config={"callbacks": [ai_handler]},
                )
                description = str(response.content)
            except Exception as e:
                success = False
                code, message = parse_openai_error(e)
                if code:
                    description = f"Error from AI [{qq.model}]: {code}, {message}"
                else:
                    description = f"Error from AI [{qq.model}]: {message}"
        else:
            description = "Failed to get image."

        if success:
            # Propose the answer to the user
            action1 = json.dumps(
                {
                    "type": "create_app",
                    "app": "Stickie",
                    "state": {"text": description, "fontSize": 16, "color": "purple"},
                    "data": {
                        "title": "Answer",
                        "position": {"x": qq.ctx.pos[0], "y": qq.ctx.pos[1], "z": 0},
                        "size": {"width": 400, "height": 500, "depth": 0},
                    },
                }
            )

            # Build the answer object
            return ImageAnswer(
                r=description,
                success=success,
                actions=[action1],
            )
        else:
            return ImageAnswer(r=description, success=success, actions=[])
