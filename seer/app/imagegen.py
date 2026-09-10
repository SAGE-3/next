#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.

"""Generic image generation.

The plain "make an image from this prompt" path, for any app that wants an
image. The prompt is used exactly as the caller wrote it: no framing, no style
is imposed here. Callers that want a particular style say so in their prompt.

This is deliberately separate from IdeatorAgent.image(), which composes a
brainstorming-specific prompt out of ideator concepts (dimensions, the
brainstorming prompt) and only makes sense inside SageIdeator.
"""

from logging import Logger

from fastapi import HTTPException
from openai import AsyncOpenAI, AsyncAzureOpenAI

from libs.localtypes import ImageGenerationRequest, ImageGenerationResponse
from libs.llm_manager import LLMManager
from libs.utils import getModelsInfo
from pysage3 import PySage3


class ImageGenAgent:
    def __init__(self, logger: Logger, ps3: PySage3):
        logger.info("Initializing ImageGenAgent")
        self.logger = logger
        self.ps3 = ps3
        self.manager = LLMManager(getModelsInfo(ps3), logger)
        # Raw OpenAI-SDK clients, keyed by (provider, model name). LLMManager
        # only builds LangChain chat/embeddings clients, so image generation
        # talks to the OpenAI SDK directly from the resolved config.
        self._image_clients: dict = {}

    def _client(self, provider: str) -> tuple:
        """(client, model_id) for the provider's imagegen-capable model."""
        info = self.manager.resolve_model(provider, "imagegen")
        if not info:
            raise HTTPException(
                status_code=400,
                detail=f"Provider '{provider}' has no model capable of image generation",
            )
        key = (provider, info["name"])
        if key in self._image_clients:
            return self._image_clients[key]

        api_key = info["api_key"] or "EMPTY"
        if info["kind"] == "azure":
            client = AsyncAzureOpenAI(
                api_key=api_key,
                azure_endpoint=info["url"],
                api_version=info["api_version"],
            )
        elif info["kind"] == "openai_compat":
            client = AsyncOpenAI(api_key=api_key, base_url=info["base_url"])
        else:
            client = AsyncOpenAI(api_key=api_key)
        self._image_clients[key] = (client, info["model_id"])
        return self._image_clients[key]

    def _resolve_provider(self, model: str) -> str:
        """Use the requested provider, falling back to the configured default."""
        return model or self.manager.default_provider() or ""

    async def generate(self, req: ImageGenerationRequest) -> ImageGenerationResponse:
        provider = self._resolve_provider(req.model)
        prompt = (req.prompt or "").strip()
        if not prompt:
            raise HTTPException(status_code=400, detail="An image prompt is required")

        client, model_id = self._client(provider)
        self.logger.info(
            f"ImageGen> provider={provider} model={model_id} prompt={prompt[:200]}"
        )

        kwargs = {
            "model": model_id,
            "prompt": prompt,
            "n": 1,
            "size": req.size or "1024x1024",
        }
        # DALL-E returns URLs unless asked for base64; gpt-image models always
        # return base64 and reject the response_format parameter.
        if model_id.startswith("dall-e"):
            kwargs["response_format"] = "b64_json"

        try:
            response = await client.images.generate(**kwargs)
            b64 = response.data[0].b64_json
            return ImageGenerationResponse(imageUrl=f"data:image/png;base64,{b64}")
        except Exception as e:
            self.logger.error(f"ImageGen> error from {provider}/{model_id}: {e}")
            raise
