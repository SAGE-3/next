# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

"""
Core data types for multimodal query processing
"""

from typing import List, Optional, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class ContentType(Enum):
    """Types of content that can be processed"""

    TEXT = "text"
    IMAGE = "image"
    PDF = "pdf"
    CODE = "code"
    WEB = "web"


class SearchStrategy(Enum):
    """Search strategies for multimodal queries"""

    SEMANTIC = "semantic"
    KEYWORD = "keyword"
    HYBRID = "hybrid"
    CROSS_MODAL = "cross_modal"


class Context(BaseModel):
    """Context information for queries"""

    previousQ: str = ""
    previousA: str = ""
    pos: List[float] = [0.0, 0.0]
    roomId: str = ""
    boardId: str = ""


class MultimodalQuery(BaseModel):
    """Unified query interface for all modalities"""

    ctx: Context
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user: str
    location: str
    model: str

    # Multimodal content
    text_content: Optional[str] = None
    image_assets: List[str] = Field(default_factory=list)  # SAGE3 asset IDs or URLs
    pdf_assets: List[str] = Field(default_factory=list)  # SAGE3 asset IDs
    code_context: Optional[str] = None
    web_urls: List[str] = Field(default_factory=list)

    # Query parameters
    question: str
    search_strategy: SearchStrategy = SearchStrategy.HYBRID
    max_results: int = 10
    similarity_threshold: float = 0.7

    # Metadata
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class ProcessedContent(BaseModel):
    """Processed content with metadata"""

    content_type: ContentType
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    embeddings: Optional[List[float]] = None
    confidence: float = 1.0


class SearchResult(BaseModel):
    """Result from vector search"""

    id: str
    content: str
    content_type: ContentType
    metadata: Dict[str, Any]
    similarity_score: float
    source: str

    class Config:
        use_enum_values = True


class RankedResult(BaseModel):
    """Ranked search result"""

    result: SearchResult
    rank: int
    relevance_score: float
    diversity_score: float
    final_score: float


class RetrievalResult(BaseModel):
    """Complete retrieval result"""

    query_id: str
    results: List[RankedResult]
    total_results: int
    search_time: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class FusedResult(BaseModel):
    """Result of cross-modal fusion"""

    fused_content: str
    source_results: List[SearchResult]
    fusion_confidence: float
    modality_weights: Dict[ContentType, float]


class MultimodalContext(BaseModel):
    """Context for LLM processing"""

    query: MultimodalQuery
    retrieved_content: RetrievalResult
    fused_content: Optional[FusedResult] = None
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)


class LLMResponse(BaseModel):
    """Response from LLM processing"""

    answer: str
    confidence: float
    sources: List[SearchResult]
    actions: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class VectorStoreConfig(BaseModel):
    """Configuration for vector store"""

    host: str = "127.0.0.1"
    port: int = 8100
    collection_prefix: str = "multimodal"
    embedding_dimensions: Dict[ContentType, int] = {
        ContentType.TEXT: 1536,
        ContentType.IMAGE: 512,
        ContentType.CODE: 1536,
        ContentType.PDF: 1536,
    }


class LLMConfig(BaseModel):
    """Configuration for LLM models"""

    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"
    azure_endpoint: Optional[str] = None
    azure_api_key: Optional[str] = None
    azure_model: str = "gpt-4o-mini"
    llama_url: Optional[str] = None
    llama_model: str = "llama-3.1-8b"
    max_tokens: int = 2000
    temperature: float = 0.7


class ProcessingConfig(BaseModel):
    """Configuration for content processing"""

    image_size: int = 600
    chunk_size: int = 1000
    chunk_overlap: int = 200
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    supported_image_formats: List[str] = ["jpg", "jpeg", "png", "webp"]
    supported_pdf_formats: List[str] = ["pdf"]
    supported_code_languages: List[str] = [
        "python",
        "javascript",
        "java",
        "cpp",
        "csharp",
    ]
