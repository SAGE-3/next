# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

"""
Core multimodal processing components
"""

from .multimodal_types import (
    MultimodalQuery,
    ContentType,
    SearchStrategy,
    ProcessedContent,
    SearchResult,
    RankedResult,
    RetrievalResult,
    FusedResult,
    MultimodalContext,
    LLMResponse,
    VectorStoreConfig,
    LLMConfig,
    ProcessingConfig,
    Context,
)

from .multimodal_agent import MultimodalAgent
from .vector_store import MultimodalVectorStore
from .content_processor import ContentProcessor
from .retriever import MultimodalRetriever
from .llm_processor import MultimodalLLM
from .cross_modal_fuser import CrossModalFuser

__all__ = [
    # Types
    "MultimodalQuery",
    "ContentType",
    "SearchStrategy",
    "ProcessedContent",
    "SearchResult",
    "RankedResult",
    "RetrievalResult",
    "FusedResult",
    "MultimodalContext",
    "LLMResponse",
    "VectorStoreConfig",
    "LLMConfig",
    "ProcessingConfig",
    "Context",
    # Components
    "MultimodalAgent",
    "MultimodalVectorStore",
    "ContentProcessor",
    "MultimodalRetriever",
    "MultimodalLLM",
    "CrossModalFuser",
]
