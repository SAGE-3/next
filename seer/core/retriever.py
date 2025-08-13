# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

"""
Multimodal retriever for intelligent content retrieval
"""

import asyncio
import time
from typing import List, Dict, Any
from logging import Logger

from .multimodal_types import (
    MultimodalQuery,
    ContentType,
    SearchStrategy,
    SearchResult,
    RankedResult,
    RetrievalResult,
)
from .vector_store import MultimodalVectorStore


class MultimodalRetriever:
    """Intelligent retrieval across multiple modalities"""

    def __init__(self, vector_store: MultimodalVectorStore, logger: Logger):
        self.vector_store = vector_store
        self.logger = logger

    async def retrieve_relevant_content(
        self, query: MultimodalQuery
    ) -> RetrievalResult:
        """Retrieve content from all relevant modalities"""
        start_time = time.time()

        # Determine which content types to search
        content_types = self._determine_content_types(query)

        # Perform multimodal search
        search_results = await self.vector_store.multimodal_search(
            query=query.question,
            content_types=content_types,
            max_results=query.max_results,
            similarity_threshold=query.similarity_threshold,
        )

        # Flatten results
        all_results = []
        for content_type, results in search_results.items():
            for result in results:
                all_results.append(result)

        # Rank results
        ranked_results = await self.rank_results(all_results)

        search_time = time.time() - start_time

        return RetrievalResult(
            query_id=query.id,
            results=ranked_results,
            total_results=len(all_results),
            search_time=search_time,
            metadata={
                "content_types_searched": [ct.value for ct in content_types],
                "search_strategy": query.search_strategy.value,
            },
        )

    def _determine_content_types(self, query: MultimodalQuery) -> List[ContentType]:
        """Determine which content types to search based on query"""
        content_types = []

        # Always include text for semantic search
        content_types.append(ContentType.TEXT)

        # Add content types based on query content
        if query.image_assets:
            content_types.append(ContentType.IMAGE)

        if query.pdf_assets:
            content_types.append(ContentType.PDF)

        if query.code_context:
            content_types.append(ContentType.CODE)

        if query.web_urls:
            content_types.append(ContentType.WEB)

        # Add content types based on question keywords
        question_lower = query.question.lower()

        if any(
            word in question_lower for word in ["image", "picture", "photo", "visual"]
        ):
            content_types.append(ContentType.IMAGE)

        if any(word in question_lower for word in ["pdf", "document", "paper"]):
            content_types.append(ContentType.PDF)

        if any(
            word in question_lower for word in ["code", "function", "program", "script"]
        ):
            content_types.append(ContentType.CODE)

        if any(word in question_lower for word in ["web", "website", "url", "link"]):
            content_types.append(ContentType.WEB)

        # Remove duplicates while preserving order
        seen = set()
        unique_types = []
        for ct in content_types:
            if ct not in seen:
                seen.add(ct)
                unique_types.append(ct)

        return unique_types

    async def rank_results(self, results: List[SearchResult]) -> List[RankedResult]:
        """Rank results by relevance and modality diversity"""
        if not results:
            return []

        # Calculate relevance scores
        relevance_scores = self._calculate_relevance_scores(results)

        # Calculate diversity scores
        diversity_scores = self._calculate_diversity_scores(results)

        # Combine scores
        ranked_results = []
        for i, result in enumerate(results):
            relevance_score = relevance_scores[i]
            diversity_score = diversity_scores[i]

            # Weighted combination (can be tuned)
            final_score = 0.7 * relevance_score + 0.3 * diversity_score

            ranked_results.append(
                RankedResult(
                    result=result,
                    rank=0,  # Will be set after sorting
                    relevance_score=relevance_score,
                    diversity_score=diversity_score,
                    final_score=final_score,
                )
            )

        # Sort by final score
        ranked_results.sort(key=lambda x: x.final_score, reverse=True)

        # Set ranks
        for i, ranked_result in enumerate(ranked_results):
            ranked_result.rank = i + 1

        return ranked_results

    def _calculate_relevance_scores(self, results: List[SearchResult]) -> List[float]:
        """Calculate relevance scores for results"""
        scores = []

        for result in results:
            # Base score from similarity
            base_score = result.similarity_score

            # Boost based on content type
            type_boost = self._get_content_type_boost(result.content_type)

            # Boost based on recency
            recency_boost = self._get_recency_boost(result.metadata)

            # Boost based on source quality
            quality_boost = self._get_quality_boost(result.metadata)

            # Combine scores
            final_score = base_score * type_boost * recency_boost * quality_boost

            scores.append(min(final_score, 1.0))  # Cap at 1.0

        return scores

    def _calculate_diversity_scores(self, results: List[SearchResult]) -> List[float]:
        """Calculate diversity scores to encourage modality variety"""
        scores = []

        # Track content types seen
        seen_types = set()

        for i, result in enumerate(results):
            # Check if this content type is new
            if result.content_type not in seen_types:
                seen_types.add(result.content_type)
                diversity_score = 1.0
            else:
                # Penalize repeated content types
                diversity_score = 0.5

            # Additional diversity based on source
            source_diversity = self._get_source_diversity(result, results[:i])

            final_diversity = (diversity_score + source_diversity) / 2
            scores.append(final_diversity)

        return scores

    def _get_content_type_boost(self, content_type: ContentType) -> float:
        """Get boost factor for content type"""
        boosts = {
            ContentType.TEXT: 1.0,
            ContentType.IMAGE: 1.2,  # Images often more valuable
            ContentType.PDF: 1.1,  # PDFs often contain structured info
            ContentType.CODE: 1.3,  # Code is often highly specific
            ContentType.WEB: 0.9,  # Web content can be less reliable
        }
        return boosts.get(content_type, 1.0)

    def _get_recency_boost(self, metadata: Dict[str, Any]) -> float:
        """Get boost factor based on recency"""
        try:
            timestamp_str = metadata.get("timestamp")
            if timestamp_str:
                from datetime import datetime

                timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                now = datetime.utcnow()
                days_old = (now - timestamp).days

                # Boost newer content
                if days_old < 1:
                    return 1.2
                elif days_old < 7:
                    return 1.1
                elif days_old < 30:
                    return 1.0
                else:
                    return 0.9
        except:
            pass

        return 1.0

    def _get_quality_boost(self, metadata: Dict[str, Any]) -> float:
        """Get boost factor based on source quality"""
        source = metadata.get("source", "")

        # Boost high-quality sources
        if source == "sage3_asset":
            return 1.2  # SAGE3 assets are curated
        elif source == "user_input":
            return 1.0  # User input is neutral
        elif source == "web":
            return 0.8  # Web content can be less reliable

        return 1.0

    def _get_source_diversity(
        self, result: SearchResult, previous_results: List[SearchResult]
    ) -> float:
        """Calculate source diversity score"""
        if not previous_results:
            return 1.0

        # Check if this source is new
        current_source = result.metadata.get("source", "")
        previous_sources = [r.metadata.get("source", "") for r in previous_results]

        if current_source not in previous_sources:
            return 1.0
        else:
            return 0.5  # Penalize repeated sources
