# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

"""
Cross-modal fusion for combining information from different modalities
"""

from typing import List, Dict, Any
from logging import Logger

from .multimodal_types import ContentType, RankedResult, FusedResult, SearchResult


class CrossModalFuser:
    """Fuse information from different modalities"""

    def __init__(self, logger: Logger):
        self.logger = logger

    async def cross_modal_fusion(
        self, ranked_results: List[RankedResult]
    ) -> FusedResult:
        """Fuse information from different modalities"""
        if not ranked_results:
            return FusedResult(
                fused_content="No content available for fusion.",
                source_results=[],
                fusion_confidence=0.0,
                modality_weights={},
            )

        # Group results by content type
        grouped_results = self._group_by_content_type(ranked_results)

        # Perform fusion
        fused_content = await self._fuse_content(grouped_results)

        # Calculate fusion confidence
        fusion_confidence = self._calculate_fusion_confidence(grouped_results)

        # Calculate modality weights
        modality_weights = self._calculate_modality_weights(grouped_results)

        # Extract source results
        source_results = [rr.result for rr in ranked_results]

        return FusedResult(
            fused_content=fused_content,
            source_results=source_results,
            fusion_confidence=fusion_confidence,
            modality_weights=modality_weights,
        )

    def _group_by_content_type(
        self, ranked_results: List[RankedResult]
    ) -> Dict[ContentType, List[RankedResult]]:
        """Group results by content type"""
        grouped = {}

        for ranked_result in ranked_results:
            content_type = ranked_result.result.content_type
            if content_type not in grouped:
                grouped[content_type] = []
            grouped[content_type].append(ranked_result)

        return grouped

    async def _fuse_content(
        self, grouped_results: Dict[ContentType, List[RankedResult]]
    ) -> str:
        """Fuse content from different modalities"""
        fusion_parts = []

        # Process each content type
        for content_type, results in grouped_results.items():
            if content_type == ContentType.TEXT:
                text_content = self._fuse_text_content(results)
                if text_content:
                    fusion_parts.append(f"Text Information:\n{text_content}")

            elif content_type == ContentType.IMAGE:
                image_content = self._fuse_image_content(results)
                if image_content:
                    fusion_parts.append(f"Visual Information:\n{image_content}")

            elif content_type == ContentType.PDF:
                pdf_content = self._fuse_pdf_content(results)
                if pdf_content:
                    fusion_parts.append(f"Document Information:\n{pdf_content}")

            elif content_type == ContentType.CODE:
                code_content = self._fuse_code_content(results)
                if code_content:
                    fusion_parts.append(f"Code Information:\n{code_content}")

            elif content_type == ContentType.WEB:
                web_content = self._fuse_web_content(results)
                if web_content:
                    fusion_parts.append(f"Web Information:\n{web_content}")

        # Combine all fused content
        if fusion_parts:
            return "\n\n".join(fusion_parts)
        else:
            return "No content could be fused."

    def _fuse_text_content(self, results: List[RankedResult]) -> str:
        """Fuse text content"""
        if not results:
            return ""

        # Sort by final score
        sorted_results = sorted(results, key=lambda x: x.final_score, reverse=True)

        # Combine top results
        text_parts = []
        for i, ranked_result in enumerate(sorted_results[:3]):  # Top 3
            content = ranked_result.result.content
            score = ranked_result.final_score

            # Truncate long content
            if len(content) > 300:
                content = content[:300] + "..."

            text_parts.append(f"[Score: {score:.2f}] {content}")

        return "\n".join(text_parts)

    def _fuse_image_content(self, results: List[RankedResult]) -> str:
        """Fuse image content"""
        if not results:
            return ""

        # Sort by final score
        sorted_results = sorted(results, key=lambda x: x.final_score, reverse=True)

        # Combine image descriptions
        image_parts = []
        for i, ranked_result in enumerate(sorted_results[:2]):  # Top 2 images
            content = ranked_result.result.content
            score = ranked_result.final_score
            metadata = ranked_result.result.metadata

            # Extract description from metadata or content
            description = metadata.get("description", content)

            image_parts.append(f"[Score: {score:.2f}] {description}")

        return "\n".join(image_parts)

    def _fuse_pdf_content(self, results: List[RankedResult]) -> str:
        """Fuse PDF content"""
        if not results:
            return ""

        # Sort by final score
        sorted_results = sorted(results, key=lambda x: x.final_score, reverse=True)

        # Combine PDF content
        pdf_parts = []
        for i, ranked_result in enumerate(sorted_results[:2]):  # Top 2 PDFs
            content = ranked_result.result.content
            score = ranked_result.final_score
            metadata = ranked_result.result.metadata

            # Truncate long content
            if len(content) > 400:
                content = content[:400] + "..."

            # Add metadata info
            pages_info = (
                f" (Pages: {metadata.get('pages', 'unknown')})"
                if metadata.get("pages")
                else ""
            )

            pdf_parts.append(f"[Score: {score:.2f}]{pages_info} {content}")

        return "\n".join(pdf_parts)

    def _fuse_code_content(self, results: List[RankedResult]) -> str:
        """Fuse code content"""
        if not results:
            return ""

        # Sort by final score
        sorted_results = sorted(results, key=lambda x: x.final_score, reverse=True)

        # Combine code content
        code_parts = []
        for i, ranked_result in enumerate(sorted_results[:2]):  # Top 2 code snippets
            content = ranked_result.result.content
            score = ranked_result.final_score
            metadata = ranked_result.result.metadata

            # Extract language and functions
            language = metadata.get("language", "unknown")
            functions = metadata.get("functions", [])

            # Truncate long code
            if len(content) > 500:
                content = content[:500] + "..."

            code_info = f"[Score: {score:.2f}] Language: {language}"
            if functions:
                code_info += f", Functions: {', '.join(functions[:3])}"

            code_parts.append(f"{code_info}\n{content}")

        return "\n\n".join(code_parts)

    def _fuse_web_content(self, results: List[RankedResult]) -> str:
        """Fuse web content"""
        if not results:
            return ""

        # Sort by final score
        sorted_results = sorted(results, key=lambda x: x.final_score, reverse=True)

        # Combine web content
        web_parts = []
        for i, ranked_result in enumerate(sorted_results[:2]):  # Top 2 web sources
            content = ranked_result.result.content
            score = ranked_result.final_score
            metadata = ranked_result.result.metadata

            # Truncate long content
            if len(content) > 400:
                content = content[:400] + "..."

            url = metadata.get("url", "unknown")

            web_parts.append(f"[Score: {score:.2f}] Source: {url}\n{content}")

        return "\n\n".join(web_parts)

    def _calculate_fusion_confidence(
        self, grouped_results: Dict[ContentType, List[RankedResult]]
    ) -> float:
        """Calculate confidence in the fusion result"""
        if not grouped_results:
            return 0.0

        # Calculate average score for each modality
        modality_scores = {}
        for content_type, results in grouped_results.items():
            if results:
                avg_score = sum(r.final_score for r in results) / len(results)
                modality_scores[content_type] = avg_score

        # Calculate overall confidence
        if modality_scores:
            # Weight by number of results in each modality
            total_confidence = 0.0
            total_weight = 0.0

            for content_type, score in modality_scores.items():
                weight = len(grouped_results[content_type])
                total_confidence += score * weight
                total_weight += weight

            if total_weight > 0:
                return total_confidence / total_weight

        return 0.5  # Default confidence

    def _calculate_modality_weights(
        self, grouped_results: Dict[ContentType, List[RankedResult]]
    ) -> Dict[ContentType, float]:
        """Calculate weights for each modality"""
        weights = {}

        if not grouped_results:
            return weights

        # Calculate total results across all modalities
        total_results = sum(len(results) for results in grouped_results.values())

        if total_results > 0:
            for content_type, results in grouped_results.items():
                # Weight based on number of results and average score
                count_weight = len(results) / total_results
                avg_score = (
                    sum(r.final_score for r in results) / len(results)
                    if results
                    else 0.0
                )

                # Combine count and score weights
                combined_weight = (count_weight + avg_score) / 2
                weights[content_type] = combined_weight

        return weights
