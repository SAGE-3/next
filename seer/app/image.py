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
import base64
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
    fetch_public_image,
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


# Keywords indicating the user wants specific images selected/filtered from the
# set (vs. a description). These trigger structured output with image indices.
SELECT_KEYWORDS = (
    "select", "which", "find the", "find all", "contain", "containing",
    "that have", "that show", "ones with", "images with", "pictures with",
    "pick", "choose", "identify", "best", "filter", "show me the",
)


def _is_select(question: str) -> bool:
    q = question.lower()
    return any(k in q for k in SELECT_KEYWORDS)


# System prompt for selection/filtering: the model returns JSON listing the
# matching image numbers so the frontend can select them on the board.
SELECT_SYSTEM = """You are shown {n} image(s), labeled "Image 1" through "Image {n}", followed by a request.
Decide which images satisfy the request.
Respond with ONLY a JSON object (no markdown, no code fence):
{{"answer": "<one or two sentence explanation>", "selected": [<matching image numbers>]}}
Use the labels as the numbers (1-based). If none match, use an empty list."""


def _parse_selection(raw: str, num_images: int):
    """Parse the selection JSON. Returns (answer_text, [valid 1-based indices])."""
    obj = {}
    start, end = raw.find("{"), raw.rfind("}")
    if start != -1 and end > start:
        try:
            obj = json.loads(raw[start : end + 1])
        except Exception:
            obj = {}
    answer = obj.get("answer") or raw
    indices = []
    for s in obj.get("selected") or []:
        try:
            i = int(s)
        except (TypeError, ValueError):
            continue
        if 1 <= i <= num_images and i not in indices:
            indices.append(i)
    return answer, indices


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

        ai_logger.emit(
            "init",
            {
                "agent": "image",
                "providers": self.manager.list_providers(),
            },
        )

    def _load_image_b64(self, asset: str):
        """Fetch an image (SAGE3 asset id, URL, or data URL), scale it, and
        return base64, or None if it can't be loaded."""
        if isDataURL(asset):
            imageContent = BytesIO(base64.b64decode(asset.split(",")[1])).getbuffer()
        elif isURL(asset):
            # Fetch and load an image from a URL, refusing private/internal addresses
            try:
                imageContent = BytesIO(fetch_public_image(asset)).getbuffer()
            except ValueError as e:
                self.logger.error(f"Refused or failed to fetch image URL: {e}")
                imageContent = None
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
        selected_assets: List[str] = []

        # Load every selected image, keeping (asset_id, base64) aligned so the
        # model's "Image N" answers map back to the right asset.
        loaded = []
        for a in qq.assets:
            b64 = self._load_image_b64(a)
            if b64:
                loaded.append((a, b64))

        if loaded:
            # Save the ai name and prompt for the logs
            ai_handler.setAI(qq.model)
            ai_handler.setPrompt(qq.q)

            # Resolve a vision-capable model for the requested provider
            llm = self.manager.build_chat_model(qq.model, ["vision"])
            if llm is None:
                from fastapi import HTTPException

                raise HTTPException(
                    status_code=400,
                    detail=f"Provider '{qq.model}' has no model capable of vision",
                )

            # One message with the question followed by every image. When there
            # are several, label them so the model can refer to / compare them.
            multiple = len(loaded) > 1
            content = [{"type": "text", "text": qq.q}]
            for i, (_, b64) in enumerate(loaded):
                if multiple:
                    content.append({"type": "text", "text": f"Image {i + 1}:"})
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64}"},
                    }
                )

            # Filter/select questions get structured output (matching indices);
            # everything else gets the normal prose description.
            select_mode = _is_select(qq.q)
            system = SELECT_SYSTEM.format(n=len(loaded)) if select_mode else sys_template_str
            messages: List[BaseMessage] = [
                SystemMessage(content=system),
                HumanMessage(content=content),
            ]
            try:
                response = await llm.ainvoke(
                    messages,
                    config={"callbacks": [ai_handler]},
                )
                raw = str(response.content)
                if select_mode:
                    description, idxs = _parse_selection(raw, len(loaded))
                    selected_assets = [loaded[i - 1][0] for i in idxs]
                else:
                    description = raw
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
                selected=selected_assets,
            )
        else:
            return ImageAnswer(r=description, success=success, actions=[], selected=[])
