# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Ideator Agent — serves the SageIdeator app's AI endpoints

import asyncio
import json
from logging import Logger

from fastapi import HTTPException
from openai import AsyncOpenAI, AsyncAzureOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from pysage3.client import PySage3
from libs.utils import getModelsInfo
from libs.llm_manager import LLMManager
from libs.localtypes import (
    IdeatorDimensionsRequest,
    IdeatorDimensionsResponse,
    IdeatorNodeRequest,
    IdeatorNodeResponse,
    IdeatorAbstractRequest,
    IdeatorAbstractResponse,
    IdeatorUserDimensionRequest,
    IdeatorUserDimensionResponse,
    IdeatorSummarizeRequest,
    IdeatorSummarizeResponse,
    IdeatorImageRequest,
    IdeatorImageResponse,
    IdeatorProseRequest,
    IdeatorProseResponse,
)

JSON_SYSTEM = "You are a helpful assistant. Return ONLY valid JSON with no extra text, markdown, or code fences."
PROSE_SYSTEM = (
    "You are a creative brainstorming assistant. Generate imaginative, practical, and diverse ideas. "
    "Write in clear, engaging, human-readable prose. Do not use JSON, bullet points, or structured formatting "
    "— write in natural paragraphs."
)


def _extract_json(text: str) -> str:
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError("No JSON object found in response")
    return text[start:end]


class IdeatorAgent:
    def __init__(self, logger: Logger, ps3: PySage3):
        logger.info("Initializing IdeatorAgent")
        self.logger = logger
        self.ps3 = ps3

        # Capability-driven model registry (providers/tasks/settings)
        self.manager = LLMManager(getModelsInfo(ps3), logger)
        # Raw OpenAI-SDK clients for image generation, keyed by (provider, model name)
        self._image_clients: dict = {}

        providers = self.manager.list_providers()
        if providers:
            logger.info("Ideator providers: " + ", ".join(providers))
        else:
            # Don't crash startup on an un-migrated/empty config: boot without a
            # provider and let each request return a clear error.
            logger.warning("IdeatorAgent> no model configured; ideator requests will fail until models are set")

    def _resolve_provider(self, model: str) -> str:
        """The request's `model` field carries a provider name (e.g. 'azure');
        fall back to the configured default provider when empty."""
        return model or self.manager.default_provider() or ""

    async def _chat(self, system: str, user: str, model: str, temperature: float = 0.7, image_base64: str | None = None) -> str:
        provider = self._resolve_provider(model)
        capability = "vision" if image_base64 else "chat"
        llm = self.manager.build_chat_model(provider, [capability], temperature=temperature)
        if llm is None:
            raise HTTPException(
                status_code=400,
                detail=f"Provider '{provider}' has no model capable of {capability}",
            )
        user_content = user
        if image_base64:
            user_content = [
                {"type": "text", "text": user},
                {"type": "image_url", "image_url": {"url": image_base64}},
            ]
        response = await llm.ainvoke(
            [SystemMessage(content=system), HumanMessage(content=user_content)]
        )
        return str(response.content)

    async def _json_chat(self, user: str, model: str, temperature: float = 0.7, image_base64: str | None = None) -> str:
        return await self._chat(JSON_SYSTEM, user, model, temperature, image_base64)

    async def _prose_chat(self, user: str, model: str, temperature: float = 0.7, image_base64: str | None = None) -> str:
        return await self._chat(PROSE_SYSTEM, user, model, temperature, image_base64)

    # ─── Endpoints ───────────────────────────────────────────────────────────

    async def dimensions(self, req: IdeatorDimensionsRequest) -> IdeatorDimensionsResponse:
        nominal_def = (
            "A nominal dimension contains categorical values that are qualitative and distinct — no right answer. "
            "Good examples for brainstorming: Approach, Stakeholder, Domain, Format, Timeframe, Constraint, Innovation Type. "
            "Do NOT use: Quality, Clarity, Grammar, Length.\n\n"
        )
        ordinal_def = (
            "An ordinal dimension contains values measured in order (e.g., least → most). "
            "Good examples for brainstorming: Feasibility, Novelty, Scope, Risk Level, Resource Intensity. "
            "Do NOT use: Quality, Creativity, Length.\n\n"
        )
        pdf_note = f"The following document has been provided as context — use it to ground dimensions in the specifics of this material:\n\n{req.pdfContext}\n\n" if req.pdfContext else ""
        image_note = f'An image has been provided alongside this prompt. Use it to inform the brainstorming where relevant to "{req.prompt}".\n\n' if req.imageBase64 else ""

        cat_msg = (
            f"{pdf_note}{image_note}{nominal_def}"
            f'List {req.numDims} nominal dimensions and 4 possible values each for the prompt: "{req.prompt}"\n'
            f'Return ONLY this JSON ({req.numDims} items):\n{{"<dim1>":["v1","v2","v3","v4"],...}}'
        )
        ord_msg = (
            f"{pdf_note}{image_note}{ordinal_def}"
            f'List {req.numDims} ordinal dimensions for the prompt: "{req.prompt}"\n'
            f'Return ONLY this JSON:\n{{"<dim>":["<lowest>","less","neutral","more","<highest>"]}}'
        )

        cat_raw, ord_raw = await asyncio.gather(
            self._json_chat(cat_msg, req.model, 0.7, req.imageBase64),
            self._json_chat(ord_msg, req.model, 0.7, req.imageBase64),
        )

        categorical = {}
        ordinal = {}
        try:
            categorical = json.loads(_extract_json(cat_raw))
        except Exception:
            pass
        try:
            ordinal = json.loads(_extract_json(ord_raw))
        except Exception:
            pass

        return IdeatorDimensionsResponse(categorical=categorical, ordinal=ordinal)

    async def node(self, req: IdeatorNodeRequest) -> IdeatorNodeResponse:
        pdf_note = f"The following document has been provided as context — ground your idea in the specifics of this material where relevant:\n\n{req.pdfContext}\n\n" if req.pdfContext else ""
        image_note = f'An image has been provided alongside this prompt. Use it to inform the brainstorming where relevant to "{req.prompt}".\n\n' if req.imageBase64 else ""
        msg = (
            f"{pdf_note}{image_note}"
            f"Brainstorming prompt: {req.prompt}\n\n"
            f"Idea constraints:\n{req.requirements}\n\n"
            "Describe one specific, actionable idea that satisfies all constraints in 1–2 natural paragraphs (up to 150 words). "
            "Be concrete and practical. Write as flowing prose, not lists or JSON."
        )
        r = await self._prose_chat(msg, req.model, 0.8, req.imageBase64)
        return IdeatorNodeResponse(r=r)

    async def abstract(self, req: IdeatorAbstractRequest) -> IdeatorAbstractResponse:
        msg = (
            f"Given the following idea text, return a structured JSON summary.\nText: {req.text}\n"
            "Rules: title ≤ 5 words, summary ≤ 20 words, 3–5 concrete action steps, ≤ 5 keywords.\n"
            "Return ONLY valid JSON:\n"
            '{"Title":"<title>","Summary":"<one sentence>","Steps":["Do X","Do Y","Do Z"],"Key Words":["w1","w2"]}'
        )
        raw = await self._json_chat(msg, req.model, req.temperature)
        try:
            j = json.loads(_extract_json(raw))
            return IdeatorAbstractResponse(
                Title=j.get("Title", ""),
                Summary=j.get("Summary", ""),
                Keywords=j.get("Key Words", []),
                Steps=j.get("Steps", []),
            )
        except Exception:
            return IdeatorAbstractResponse(
                Title=req.text[:30],
                Summary=req.text[:80] + "…",
                Keywords=[],
                Steps=[],
            )

    async def user_dimension(self, req: IdeatorUserDimensionRequest) -> IdeatorUserDimensionResponse:
        type_msg = (
            f'Brainstorming topic: "{req.prompt}"\n'
            f'A user wants to add a dimension called "{req.dimName}" to evaluate ideas.\n'
            "Decide if it is categorical (distinct qualitative options) or ordinal (ranked low→high).\n"
            "Suggest exactly 4 values.\n"
            'Return ONLY valid JSON: {"type":"categorical","values":["v1","v2","v3","v4"]}'
        )
        type_raw = await self._json_chat(type_msg, req.model, 0)
        dim_type = "categorical"
        values = []
        try:
            j = json.loads(_extract_json(type_raw))
            dim_type = "ordinal" if j.get("type") == "ordinal" else "categorical"
            values = j.get("values", [])[:4]
        except Exception:
            pass
        if not values:
            values = ["Low", "Medium", "High", "Very High"]

        node_list = "\n".join([f'- ID: {n.ID} | Title: "{n.Title}" | Summary: "{n.Summary}"' for n in req.nodes])
        assign_msg = (
            f'Dimension: "{req.dimName}" ({dim_type})\n'
            f"Values: {json.dumps(values)}\n\n"
            "Assign each idea exactly one value from the list above.\n"
            f"Ideas:\n{node_list}\n\n"
            'Return ONLY valid JSON mapping each ID to its assigned value:\n{"<id>":"<value>",...}'
        )
        assign_raw = await self._json_chat(assign_msg, req.model, 0)
        assignments = {}
        try:
            assignments = json.loads(_extract_json(assign_raw))
        except Exception:
            pass

        return IdeatorUserDimensionResponse(type=dim_type, values=values, assignments=assignments)

    async def summarize(self, req: IdeatorSummarizeRequest) -> IdeatorSummarizeResponse:
        node_list = "\n".join([f'{i + 1}. "{n.Title}": {n.Summary}' for i, n in enumerate(req.nodes)])
        msg = (
            f'Brainstorming topic: "{req.prompt}"\n\n'
            f"These ideas were favorited:\n{node_list}\n\n"
            "Write a concise synthesis with three clearly labeled sections (2–3 sentences each):\n"
            "Common Themes — what do these ideas share?\n"
            "Key Contrasts — how do they meaningfully differ?\n"
            "Synthesis — what single direction or key insight emerges from combining them?\n\n"
            "Write in flowing prose. Do not use JSON, markdown symbols, or bullet points."
        )
        r = await self._prose_chat(msg, req.model, 0.7)
        return IdeatorSummarizeResponse(r=r)

    def _image_client(self, provider: str) -> tuple:
        """(client, model_id) for the provider's imagegen-capable model.
        LLMManager only builds LangChain chat/embeddings clients, so image
        generation uses the OpenAI SDK directly from the resolved config."""
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
        return client, info["model_id"]

    async def image(self, req: IdeatorImageRequest) -> IdeatorImageResponse:
        provider = self._resolve_provider(req.model)
        client, model_id = self._image_client(provider)
        topic_line = (
            f'Conceptual illustration for a brainstorming idea about: "{req.brainstormingPrompt}". '
            if req.brainstormingPrompt
            else "A conceptual illustration for the following idea. "
        )
        dim_entries = []
        if req.dimension:
            dim_entries = list(req.dimension.categorical.items()) + list(req.dimension.ordinal.items())
        dim_line = (
            f"It is characterized as: {', '.join([f'{k}: {v}' for k, v in dim_entries])}. "
            if dim_entries
            else ""
        )
        context_line = f"Additional context: {req.additionalContext}. " if req.additionalContext else ""
        prompt = (
            topic_line
            + f'The idea is titled "{req.title}" — {req.summary} '
            + dim_line
            + f"Visual themes: {', '.join(req.keywords)}. "
            + context_line
            + "Abstract, minimal, clean design. No text, labels, or words."
        )
        self.logger.info(f"IdeatorAgent.image: provider={provider}, model={model_id}, prompt={prompt[:200]}")
        kwargs = {"model": model_id, "prompt": prompt, "n": 1, "size": "1024x1024"}
        # DALL-E returns URLs unless asked for base64; gpt-image models always
        # return base64 and reject the response_format parameter.
        if model_id.startswith("dall-e"):
            kwargs["response_format"] = "b64_json"
        try:
            response = await client.images.generate(**kwargs)
            b64 = response.data[0].b64_json
            data_url = f"data:image/png;base64,{b64}"
            return IdeatorImageResponse(imageUrl=data_url)
        except Exception as e:
            self.logger.error(f"IdeatorAgent.image: error from {provider}/{model_id}: {e}")
            raise

    async def prose(self, req: IdeatorProseRequest) -> IdeatorProseResponse:
        r = await self._prose_chat(req.userPrompt, req.model, 0.7)
        return IdeatorProseResponse(r=r)
