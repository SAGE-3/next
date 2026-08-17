# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

#
# LLM Manager
#
# Capability-driven helper around the new SAGE3 "models" configuration. It is
# the Python counterpart of the TypeScript `LLMConfigManager` in
# webstack/libs/shared/src/lib/types/server/llm.ts and mirrors its task ->
# capability mapping so the frontend and backend agree on what a provider can
# do.
#
# The configuration shape (returned by libs.utils.getModelsInfo) is:
#   {
#     "providers": {
#       "<provider>": {
#         "apiKey": str?, "url": str?,
#         "models": {
#           "<name>": { "model_id": str, "capabilities": [..],
#                       "api_version": str?, "max_tokens": int?, ... }
#         }
#       }
#     },
#     "tasks": { "<task>": { "provider": str, "models": [str] } },
#     "settings": { "default_provider": str, ... }
#   }

from logging import Logger
from typing import Dict, List, Optional, Union

# AI Models
from langchain_openai import (
    ChatOpenAI,
    AzureChatOpenAI,
    OpenAIEmbeddings,
    AzureOpenAIEmbeddings,
)

# Capabilities a model can declare
Capability = str  # 'chat' | 'imagegen' | 'vision' | 'code' | 'embeddings'

# Tasks the system can perform and the capabilities each one requires.
# Must stay in sync with TASK_CAPABILITIES in the shared TypeScript llm.ts.
TASK_CAPABILITIES: Dict[str, List[Capability]] = {
    "image": ["vision"],
    "coding": ["code"],
    "image_generation": ["imagegen"],
    "chat": ["chat"],
    # Embeddings/reranking are shared retrieval infrastructure (models.embed /
    # models.rerank), not a per-provider capability — PDF only needs chat.
    "pdf_processing": ["chat"],
}


class LLMManager:
    """Resolve and construct LangChain models from the SAGE3 model registry."""

    def __init__(self, config: dict, logger: Optional[Logger] = None):
        self.config = config or {}
        self.providers: dict = self.config.get("providers", {}) or {}
        self.tasks: dict = self.config.get("tasks", {}) or {}
        self.settings: dict = self.config.get("settings", {}) or {}
        self.logger = logger
        # Cache built clients so we don't reconstruct them on every request
        self._chat_cache: dict = {}
        self._embed_cache: dict = {}

    #
    # Introspection
    #

    def list_providers(self) -> List[str]:
        return list(self.providers.keys())

    def default_provider(self) -> Optional[str]:
        return self.settings.get("default_provider")

    def get_provider(self, provider: str) -> Optional[dict]:
        return self.providers.get(provider)

    def provider_capabilities(self, provider: str) -> set:
        """Union of capabilities across all of a provider's models."""
        p = self.get_provider(provider)
        if not p:
            return set()
        caps: set = set()
        for model in (p.get("models") or {}).values():
            caps.update(model.get("capabilities") or [])
        return caps

    def has_capability(self, provider: str, capability: Capability) -> bool:
        return capability in self.provider_capabilities(provider)

    def can_provider_perform_task(self, provider: str, task: str) -> bool:
        """Union match: every capability the task needs exists somewhere
        across the provider's models (same semantics as the frontend)."""
        required = TASK_CAPABILITIES.get(task, [])
        caps = self.provider_capabilities(provider)
        return all(cap in caps for cap in required)

    #
    # Model selection
    #

    def find_model(self, provider: str, capability: Capability) -> Optional[tuple]:
        """First (name, model_cfg) in the provider that has `capability`."""
        p = self.get_provider(provider)
        if not p:
            return None
        for name, model in (p.get("models") or {}).items():
            if capability in (model.get("capabilities") or []):
                return (name, model)
        return None

    def find_model_any(
        self, provider: str, capabilities: List[Capability]
    ) -> Optional[tuple]:
        """First model matching any capability, in preference order."""
        for cap in capabilities:
            found = self.find_model(provider, cap)
            if found:
                return found
        return None

    def _provider_kind(self, provider_cfg: dict, model_cfg: dict) -> str:
        """Infer which SDK to use from the config fields.

        - url + model api_version  -> Azure OpenAI
        - url only                 -> OpenAI-compatible endpoint (litellm, NVIDIA, ...)
        - neither                  -> OpenAI
        """
        url = provider_cfg.get("url")
        api_version = model_cfg.get("api_version")
        if url and api_version:
            return "azure"
        if url:
            return "openai_compat"
        return "openai"

    @staticmethod
    def _normalize_base_url(url: str) -> str:
        url = (url or "").rstrip("/")
        if url and not url.endswith("/v1"):
            url = url + "/v1"
        return url

    def resolve_model(
        self, provider: str, capabilities: Union[str, List[Capability]]
    ) -> Optional[dict]:
        """Return the raw connection details for the best matching model, or
        None when the provider has no model with any of the capabilities."""
        if isinstance(capabilities, str):
            capabilities = [capabilities]
        p = self.get_provider(provider)
        if not p:
            return None
        found = self.find_model_any(provider, capabilities)
        if not found:
            return None
        name, model = found
        url = p.get("url")
        return {
            "kind": self._provider_kind(p, model),
            "name": name,
            "model_id": model.get("model_id"),
            "api_key": p.get("apiKey"),
            "url": url,
            "base_url": self._normalize_base_url(url) if url else None,
            "api_version": model.get("api_version"),
            "max_tokens": model.get("max_tokens"),
            "context_window": model.get("context_window"),
        }

    def rerank_config(self) -> Optional[dict]:
        """Connection info for the reranking service, or None if not configured.

        Read from the optional `rerank` block of the models config:
            "rerank": { "url": "http://host:8000", "model": "<model_id>" }
        """
        rr = self.config.get("rerank") or {}
        url = rr.get("url")
        model = rr.get("model")
        if url and model:
            return {"url": url.rstrip("/"), "model": model, "apiKey": rr.get("apiKey")}
        return None

    def embed_config(self) -> Optional[dict]:
        """Connection info for a dedicated embedding service (NIM), or None.

        Read from the optional `embed` block of the models config:
            "embed": { "url": "http://host:8000", "model": "<model_id>" }
        Takes precedence over provider-based embeddings for retrieval.
        """
        e = self.config.get("embed") or {}
        url = e.get("url")
        model = e.get("model")
        if url and model:
            return {"url": url.rstrip("/"), "model": model, "apiKey": e.get("apiKey")}
        return None

    def ocr_config(self) -> Optional[dict]:
        """Connection info for a PDF->Markdown OCR service (olmOCR vLLM server),
        or None. Read from the optional `pdf2md` block of the models config:
            "pdf2md": { "url": "http://host/olmocr/v1", "model": "<model_id>" }
        The url must include the /v1 path: olmocr's pipeline appends only
        /chat/completions to it.
        """
        o = self.config.get("pdf2md") or {}
        url = o.get("url")
        model = o.get("model")
        if url and model:
            return {"url": url.rstrip("/"), "model": model}
        return None

    #
    # Client construction
    #

    def build_chat_model(
        self, provider: str, capabilities: Union[str, List[Capability]], **kwargs
    ):
        """Build (and cache) a LangChain chat model for the first model in
        `provider` matching one of `capabilities`. Returns None if no match."""
        if isinstance(capabilities, str):
            capabilities = [capabilities]
        cache_key = (provider, tuple(capabilities), tuple(sorted(kwargs.items())))
        if cache_key in self._chat_cache:
            return self._chat_cache[cache_key]

        info = self.resolve_model(provider, capabilities)
        if not info:
            return None

        kind = info["kind"]
        model_id = info["model_id"]
        api_key = info["api_key"] or "EMPTY"

        if kind == "azure":
            llm = AzureChatOpenAI(
                azure_deployment=model_id,
                api_version=info["api_version"],
                azure_endpoint=info["url"],
                api_key=api_key,
                model=model_id,
                **kwargs,
            )
        elif kind == "openai_compat":
            llm = ChatOpenAI(
                base_url=info["base_url"],
                model=model_id,
                api_key=api_key,
                **kwargs,
            )
        else:
            llm = ChatOpenAI(api_key=api_key, model=model_id, **kwargs)

        self._chat_cache[cache_key] = llm
        return llm

    def build_embeddings(self, provider: str):
        """Build (and cache) an embeddings client for the provider's first
        embeddings-capable model. Returns None if none exists."""
        if provider in self._embed_cache:
            return self._embed_cache[provider]

        info = self.resolve_model(provider, "embeddings")
        if not info:
            return None

        kind = info["kind"]
        model_id = info["model_id"]
        api_key = info["api_key"] or "EMPTY"

        if kind == "azure":
            emb = AzureOpenAIEmbeddings(
                model=model_id,
                azure_endpoint=info["url"],
                api_key=api_key,
                api_version=info["api_version"],
            )
        elif kind == "openai_compat":
            emb = OpenAIEmbeddings(
                model=model_id, base_url=info["base_url"], api_key=api_key
            )
        else:
            emb = OpenAIEmbeddings(model=model_id, api_key=api_key)

        self._embed_cache[provider] = emb
        return emb
