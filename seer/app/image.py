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
from PIL import Image
import base64
from typing import List

# SAGE3 API
from pysage3.client import PySage3

# AI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage

# Typing for RPC
from libs.localtypes import ImageQuery, ImageAnswer, SlideQuery, SlideAnswer
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


# Finding a presentation slide in a screenshot (a video call window, a screen)
SLIDE_SYSTEM = """You are shown a screenshot, for example of a video call where someone shares a presentation.
Find the presentation slide in it: the shared slide or screen content only, without the window's
toolbars, buttons, participant videos or thumbnails, names, chat, or borders.
Respond with ONLY a JSON object (no markdown, no code fence, no other fields), using exactly these keys:
{"found": true, "box": [left, top, right, bottom], "slide_number": 15, "slide_title": "Results"}
where the box is the slide's edges as fractions of the screenshot's width and height (0 to 1,
left and top first). slide_number is the slide's number if it is visible (on the slide, or in the
presentation's window), else null; slide_title is the slide's title as written on it, else null.
If there is no slide or shared content, respond {"found": false, "box": []}."""

# Size of the copy the model looks at; the crop is made in the full-resolution screenshot
SlideImageSize = 1024
# A box smaller than this share of the screenshot is not taken for a slide
SlideMinArea = 0.05


def _parse_slide_box(raw: str, width: int = 0, height: int = 0):
    """The model's box as [left, top, right, bottom] fractions, or None if there is no usable one.

    Models name the box differently ("box", "bbox", "bbox_normalized", "bounding_box", ...), so
    any key with "box" in it holding 4 numbers is taken. Values above 1 are read as pixels of the
    image the model saw (width x height)."""
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        obj = json.loads(raw[start : end + 1])
        if obj.get("found") is False:
            return None
        box = obj.get("box")
        if box is None:
            box = next((v for k, v in obj.items() if "box" in k.lower() and isinstance(v, list) and len(v) == 4), None)
        values = [float(v) for v in box]
        if len(values) != 4:
            return None
        if max(values) > 1:
            if not width or not height:
                return None
            values = [values[0] / width, values[1] / height, values[2] / width, values[3] / height]
        left, top, right, bottom = [min(max(v, 0.0), 1.0) for v in values]
    except (ValueError, TypeError, AttributeError):
        return None
    if right <= left or bottom <= top or (right - left) * (bottom - top) < SlideMinArea:
        return None
    return [left, top, right, bottom]


def _parse_slide_info(raw: str):
    """The slide's number and title from the model's answer, each None when not given."""
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end <= start:
        return None, None
    try:
        obj = json.loads(raw[start : end + 1])
    except ValueError:
        return None, None
    if not isinstance(obj, dict):
        return None, None
    number = obj.get("slide_number")
    try:
        number = int(number) if number is not None and not isinstance(number, bool) else None
    except (TypeError, ValueError):
        number = None
    if number is not None and number < 1:
        number = None
    title = obj.get("slide_title")
    title = title.strip()[:200] if isinstance(title, str) and title.strip() else None
    return number, title


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

    async def find_slide(self, qq: SlideQuery) -> SlideAnswer:
        """Find the presentation slide in a screenshot with a vision model, and crop it from the
        full-resolution screenshot."""
        self.logger.info("Got slide> from " + qq.user + " - " + qq.model)
        if not isDataURL(qq.image):
            return SlideAnswer(success=False, r="The screenshot must be a data URL.")
        data = base64.b64decode(qq.image.split(",", 1)[1])
        full = Image.open(BytesIO(data))
        full.load()
        # The model sees a smaller copy; the crop uses the full resolution
        small = scaleImage(data, SlideImageSize)
        small_size = Image.open(BytesIO(small)).size
        b64 = base64.b64encode(small).decode("utf-8")

        llm = self.manager.build_chat_model(qq.model, ["vision"], user_llm=LLMManager.user_credentials(qq))
        if llm is None:
            from fastapi import HTTPException

            raise HTTPException(status_code=400, detail=f"Provider '{qq.model}' has no model capable of vision")

        ai_handler.setAI(qq.model)
        ai_handler.setPrompt("find slide")
        prompt = """You are given a screenshot of a video call (e.g. Zoom or Teams) in which someone
is sharing a presentation application (PowerPoint, Keynote, Google Slides, etc.).

Task: locate the single slide currently being displayed at the largest size,
meaning the main slide canvas or the full-screen slide if it is in presentation mode.

Do NOT select:
- slide thumbnails in the sidebar/filmstrip
- the application window as a whole, toolbars, ribbons, or the notes pane
- participant video tiles, chat, or meeting control panels
- the grey/white pasteboard area surrounding the slide

The slide is a filled rectangle, usually close to 16:9 or 4:3. Its edge is where
the slide's own background meets the surrounding pasteboard or window background.
Fit the box tightly to that edge, not to the content inside it.

Find the slide number and the slide title if visible in the image. Add them to the JSON output accordingly.

Return ONLY JSON, no prose:
{
  "found": true | false,
  "bbox_normalized": [x_min, y_min, x_max, y_max],   // 0.0–1.0, relative to full image width/height
  "aspect_ratio": <width/height of your box in pixels>,
  "slide_number": <int or null, if visible in the UI, e.g. "Slide 6 of 15">,
  "slide_title": <string or null>,
  "mode": "editor" | "presenting" | "unknown",
  "confidence": 0.0–1.0
}

If no slide is visible, return {"found": false} with the other fields null."""
        messages: List[BaseMessage] = [
            SystemMessage(content=SLIDE_SYSTEM),
            HumanMessage(
                content=[
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                ]
            ),
        ]
        try:
            # JSON mode: the answer is a JSON object, with no fence or text around it
            response = await llm.bind(response_format={"type": "json_object"}).ainvoke(
                messages, config={"callbacks": [ai_handler]}
            )
        except Exception as first:
            # Some OpenAI-compatible servers don't support JSON mode: ask again without it
            self.logger.info(f"Slide> JSON mode failed for [{qq.model}] ({first}), asking without it")
            try:
                response = await llm.ainvoke(messages, config={"callbacks": [ai_handler]})
            except Exception as e:
                code, message = parse_openai_error(e)
                self.logger.error(f"Error from AI [{qq.model}]: {code + ', ' if code else ''}{message}")
                return SlideAnswer(success=False, r=f"Error from AI [{qq.model}]: {code + ', ' if code else ''}{message}")
        self.logger.info(f"AI response from [{qq.model}]: {response.content}")
        raw = str(response.content)
        box = _parse_slide_box(raw, *small_size)
        if box is None:
            return SlideAnswer(success=True, found=False)
        width, height = full.size
        crop = full.crop(
            (round(box[0] * width), round(box[1] * height), round(box[2] * width), round(box[3] * height))
        )
        out = BytesIO()
        crop.save(out, format="PNG")
        number, title = _parse_slide_info(raw)
        return SlideAnswer(
            success=True,
            found=True,
            box=box,
            slideNumber=number,
            slideTitle=title,
            image="data:image/png;base64," + base64.b64encode(out.getvalue()).decode("utf-8"),
        )

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
            llm = self.manager.build_chat_model(
                qq.model, ["vision"], user_llm=LLMManager.user_credentials(qq)
            )
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
