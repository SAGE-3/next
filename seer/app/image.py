# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Image Agent

import json
import asyncio
from logging import Logger
from typing import List, Optional, Dict, Any, Union
from dataclasses import dataclass
from enum import Enum

import httpx
from io import BytesIO
import base64

# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3

# AI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI, AzureChatOpenAI

# Typing for RPC
from libs.localtypes import ImageQuery, ImageAnswer
from libs.utils import getModelsInfo, getImageFile, scaleImage, isURL, isDataURL

# AI logging
from libs.ai_logging import ai_logger, LoggingLLMHandler

# Handler in Langchain to log the AI prompt
ai_handler = LoggingLLMHandler("image")

# Configuration constants
DEFAULT_IMAGE_SIZE = 600
DEFAULT_MAX_TOKENS = 1500
DEFAULT_TIMEOUT = 30.0


class ModelType(Enum):
    """Enumeration for supported AI models"""

    LLAMA = "llama"
    OPENAI = "openai"
    AZURE = "azure"


@dataclass
class ImageProcessingConfig:
    """Configuration for image processing"""

    image_size: int = DEFAULT_IMAGE_SIZE
    max_tokens: int = DEFAULT_MAX_TOKENS
    timeout: float = DEFAULT_TIMEOUT
    streaming: bool = False


class ImageProcessor:
    """Handles image loading and preprocessing"""

    def __init__(self, config: ImageProcessingConfig):
        self.config = config
        self.httpx_client = httpx.AsyncClient(timeout=config.timeout)

    async def load_image(self, asset: str, ps3: PySage3) -> Optional[bytes]:
        """
        Load image content from various sources (data URL, URL, or SAGE3 asset)

        Args:
            asset: Image source (data URL, URL, or asset ID)
            ps3: SAGE3 API handle

        Returns:
            Image bytes or None if loading fails
        """
        try:
            if isDataURL(asset):
                return self._load_from_data_url(asset)
            elif isURL(asset):
                return await self._load_from_url(asset)
            else:
                return self._load_from_sage3(asset, ps3)
        except Exception as e:
            raise ValueError(f"Failed to load image: {str(e)}")

    def _load_from_data_url(self, data_url: str) -> bytes:
        """Load image from base64 data URL"""
        try:
            # Extract base64 data after the comma
            base64_data = data_url.split(",", 1)[1]
            return base64.b64decode(base64_data)
        except Exception as e:
            raise ValueError(f"Invalid data URL format: {str(e)}")

    async def _load_from_url(self, url: str) -> bytes:
        """Load image from URL asynchronously"""
        try:
            response = await self.httpx_client.get(url)
            response.raise_for_status()
            return response.content
        except httpx.HTTPError as e:
            raise ValueError(f"Failed to fetch image from URL: {str(e)}")

    def _load_from_sage3(self, asset_id: str, ps3: PySage3) -> Optional[bytes]:
        """Load image from SAGE3 asset"""
        return getImageFile(ps3, asset_id)

    def process_image(self, image_content: bytes) -> str:
        """
        Process image content for LLM consumption

        Args:
            image_content: Raw image bytes

        Returns:
            Base64 encoded image string
        """
        try:
            # Scale the image to the desired size
            scaled_image = scaleImage(image_content, self.config.image_size)
            # Convert to base64
            return base64.b64encode(scaled_image).decode("utf-8")
        except Exception as e:
            raise ValueError(f"Failed to process image: {str(e)}")

    async def close(self):
        """Clean up resources"""
        await self.httpx_client.aclose()


class LLMProcessor:
    """Handles LLM communication for different models"""

    def __init__(self, models_info: Dict[str, Any], config: ImageProcessingConfig):
        self.config = config
        self.models = self._initialize_models(models_info)

    def _initialize_models(self, models_info: Dict[str, Any]) -> Dict[str, Any]:
        """Initialize LLM models based on configuration"""
        models = {}

        # Initialize Llama model
        llama = models_info.get("llama", {})
        if llama.get("url") and llama.get("model"):
            models[ModelType.LLAMA.value] = ChatNVIDIA(
                base_url=llama["url"] + "/v1",
                model=llama["model"],
                stream=self.config.streaming,
                max_tokens=self.config.max_tokens,
            )

        # Initialize OpenAI model
        openai = models_info.get("openai", {})
        if openai.get("apiKey") and openai.get("model"):
            models[ModelType.OPENAI.value] = ChatOpenAI(
                api_key=openai["apiKey"],
                model=openai["model"],
                streaming=self.config.streaming,
            )

        # Initialize Azure model
        azure = models_info.get("azure", {})
        if azure.get("vision", {}).get("apiKey") and azure.get("vision", {}).get(
            "model"
        ):
            vision_config = azure["vision"]
            models[ModelType.AZURE.value] = AzureChatOpenAI(
                azure_deployment=vision_config["model"],
                api_version=vision_config["api_version"],
                azure_endpoint=vision_config["url"],
                azure_ad_token=vision_config["apiKey"],
                model=vision_config["model"],
            )

        return models

    def _create_messages(
        self, question: str, image_base64: str, model_type: str
    ) -> List[BaseMessage]:
        """Create messages for LLM processing"""
        system_template = """You are a helpful and succinct assistant, providing informative answers.
  Always format your responses using valid Markdown syntax. Use appropriate elements like:
  •	# for headings
  •	**bold** or _italic_ for emphasis
  •	`inline code` and code blocks (...) for code
  •	Bullet lists, numbered lists, and links as needed
  If you include code, always wrap it in fenced code blocks with the correct language tag (e.g., ```python). Default to Python if no language is specified. If asked to create plots, please use Matplotlib. .
  If you don't know the answer, say "I don't know" and suggest to search the web."""

        messages = []

        # Add system message (different for Llama vs others)
        if model_type == ModelType.LLAMA.value:
            messages.append(AIMessage(content=system_template))
        else:
            messages.append(SystemMessage(content=system_template))

        # Add human message with image
        messages.append(
            HumanMessage(
                content=[
                    {"type": "text", "text": question},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_base64}"},
                    },
                ]
            )
        )

        return messages

    async def process_with_model(
        self, question: str, image_base64: str, model_type: str
    ) -> str:
        """
        Process image and question with specified LLM model

        Args:
            question: User's question about the image
            image_base64: Base64 encoded image
            model_type: Type of model to use

        Returns:
            Model's response as string
        """
        if model_type not in self.models:
            raise ValueError(f"Model {model_type} is not available")

        model = self.models[model_type]
        messages = self._create_messages(question, image_base64, model_type)

        try:
            response = await model.ainvoke(
                messages,
                config={"callbacks": [ai_handler]},
            )
            return str(response.content)
        except Exception as e:
            raise RuntimeError(f"LLM processing failed: {str(e)}")


class ImageAgent:
    """Agent for processing image analysis requests"""

    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
        config: Optional[ImageProcessingConfig] = None,
    ):
        self.logger = logger
        self.ps3 = ps3
        self.config = config or ImageProcessingConfig()

        # Initialize components
        models_info = getModelsInfo(ps3)
        self.image_processor = ImageProcessor(self.config)
        self.llm_processor = LLMProcessor(models_info, self.config)

        # Log initialization
        self._log_initialization(models_info)

    def _log_initialization(self, models_info: Dict[str, Any]):
        """Log agent initialization status"""
        self.logger.info("Initializing ImageAgent")

        ai_logger.emit(
            "init",
            {
                "agent": "image",
                "openai": bool(models_info.get("openai", {}).get("apiKey")),
                "llama": bool(models_info.get("llama", {}).get("url")),
                "azure": bool(
                    models_info.get("azure", {}).get("vision", {}).get("apiKey")
                ),
                "config": {
                    "image_size": self.config.image_size,
                    "max_tokens": self.config.max_tokens,
                    "timeout": self.config.timeout,
                },
            },
        )

    async def process(self, qq: ImageQuery) -> ImageAnswer:
        """
        Process image analysis request

        Args:
            qq: Image query containing question and image source

        Returns:
            ImageAnswer with analysis results and actions
        """
        self.logger.info(
            f"Processing image request from {qq.user}: {qq.q} - {qq.model}"
        )

        try:
            # Validate input
            self._validate_query(qq)

            # Load and process image
            image_content = await self.image_processor.load_image(qq.asset, self.ps3)
            if not image_content:
                raise ValueError("Failed to load image content")

            # Process image for LLM
            image_base64 = self.image_processor.process_image(image_content)

            # Set up AI logging
            ai_handler.setAI(qq.model)
            ai_handler.setPrompt(qq.q)

            # Process with LLM
            description = await self.llm_processor.process_with_model(
                qq.q, image_base64, qq.model
            )

            # Create response
            return self._create_response(description, qq.ctx.pos)

        except Exception as e:
            self.logger.error(f"Image processing failed: {str(e)}", exc_info=True)
            return self._create_error_response(str(e))

    def _validate_query(self, qq: ImageQuery):
        """Validate input query"""
        if not qq.q or not qq.q.strip():
            raise ValueError("Question cannot be empty")

        if not qq.asset:
            raise ValueError("Image asset cannot be empty")

        if not qq.model:
            raise ValueError("Model type must be specified")

        if qq.model not in [model.value for model in ModelType]:
            raise ValueError(f"Unsupported model type: {qq.model}")

    def _create_response(self, description: str, position: List[float]) -> ImageAnswer:
        """Create successful response with actions"""
        action = json.dumps(
            {
                "type": "create_app",
                "app": "Stickie",
                "state": {"text": description, "fontSize": 16, "color": "purple"},
                "data": {
                    "title": "Answer",
                    "position": {"x": position[0], "y": position[1], "z": 0},
                    "size": {"width": 400, "height": 500, "depth": 0},
                },
            }
        )

        return ImageAnswer(
            r=description,
            success=True,
            actions=[action],
        )

    def _create_error_response(self, error_message: str) -> ImageAnswer:
        """Create error response"""
        action = json.dumps(
            {
                "type": "create_app",
                "app": "Stickie",
                "state": {
                    "text": f"Error: {error_message}",
                    "fontSize": 16,
                    "color": "red",
                },
                "data": {
                    "title": "Error",
                    "position": {"x": 0, "y": 0, "z": 0},
                    "size": {"width": 400, "height": 200, "depth": 0},
                },
            }
        )

        return ImageAnswer(
            r=f"Failed to process image: {error_message}",
            success=False,
            actions=[action],
        )

    async def close(self):
        """Clean up resources"""
        await self.image_processor.close()
