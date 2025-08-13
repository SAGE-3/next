# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

"""
Unified LLM processor for multimodal queries
"""

from typing import List, Dict, Any, Optional
from logging import Logger

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI, AzureChatOpenAI

from .multimodal_types import (
    MultimodalQuery,
    MultimodalContext,
    LLMResponse,
    SearchResult,
    LLMConfig,
)


class MultimodalLLM:
    """Unified LLM interface for all modalities"""

    def __init__(self, config: LLMConfig, logger: Logger):
        self.config = config
        self.logger = logger
        self.models = self._initialize_models()

    def _initialize_models(self) -> Dict[str, Any]:
        """Initialize LLM models based on configuration"""
        models = {}

        # Initialize OpenAI model
        if self.config.openai_api_key:
            models["openai"] = ChatOpenAI(
                api_key=self.config.openai_api_key,
                model=self.config.openai_model,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                streaming=False,
            )

        # Initialize Azure model
        if self.config.azure_api_key and self.config.azure_endpoint:
            models["azure"] = AzureChatOpenAI(
                azure_deployment=self.config.azure_model,
                api_version="2024-12-01-preview",
                azure_endpoint=self.config.azure_endpoint,
                azure_ad_token=self.config.azure_api_key,
                model=self.config.azure_model,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                streaming=False,
            )

        # Initialize Llama model
        if self.config.llama_url:
            models["llama"] = ChatNVIDIA(
                base_url=self.config.llama_url + "/v1",
                model=self.config.llama_model,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                streaming=False,
            )

        return models

    async def process_multimodal_query(
        self, query: MultimodalQuery, context: MultimodalContext
    ) -> LLMResponse:
        """Process query with multimodal context"""
        try:
            # Select appropriate model
            model = self._select_model(query.model)
            if not model:
                raise ValueError(f"No model available for: {query.model}")

            # Create messages
            messages = self._create_multimodal_messages(query, context)

            # Process with LLM
            response = await model.ainvoke(messages)

            # Extract sources
            sources = self._extract_sources(context)

            # Calculate confidence
            confidence = self._calculate_confidence(context, response)

            return LLMResponse(
                answer=str(response.content),
                confidence=confidence,
                sources=sources,
                actions=[],  # Will be set by the main agent
                metadata={
                    "model_used": query.model,
                    "context_size": len(context.retrieved_content.results),
                    "fusion_confidence": (
                        context.fused_content.fusion_confidence
                        if context.fused_content
                        else 0.0
                    ),
                },
            )

        except Exception as e:
            self.logger.error(f"LLM processing failed: {e}")
            raise

    def _select_model(self, model_name: str):
        """Select appropriate model based on name"""
        model_mapping = {"openai": "openai", "azure": "azure", "llama": "llama"}

        model_key = model_mapping.get(model_name.lower())
        return self.models.get(model_key)

    def _create_multimodal_messages(
        self, query: MultimodalQuery, context: MultimodalContext
    ) -> List[BaseMessage]:
        """Create messages for multimodal processing"""
        messages = []

        # System message
        system_message = self._create_system_message(query, context)
        messages.append(system_message)

        # Human message with context
        human_message = self._create_human_message(query, context)
        messages.append(human_message)

        return messages

    def _create_system_message(
        self, query: MultimodalQuery, context: MultimodalContext
    ) -> BaseMessage:
        """Create system message for multimodal processing"""
        system_template = f"""You are a helpful and knowledgeable assistant that can process queries across multiple content types including text, images, PDFs, code, and web content.

You have access to retrieved information from various sources and modalities. Your task is to provide comprehensive, accurate, and well-structured answers that synthesize information from all relevant sources.

Guidelines:
1. Always format responses using valid Markdown syntax
2. Use appropriate elements like headings, bold/italic text, code blocks, and lists
3. When referencing code, use fenced code blocks with language tags
4. Cite your sources when possible
5. If you don't know the answer, say so and suggest alternatives
6. Be concise but thorough
7. Consider the context from previous conversation if available

Current query context:
- User: {query.user}
- Location: {query.location}
- Content types involved: {self._get_content_types_involved(query, context)}
- Number of retrieved sources: {len(context.retrieved_content.results)}

Provide a comprehensive answer that addresses the user's question using all available information."""

        # Use different message types for different models
        if query.model.lower() == "llama":
            return AIMessage(content=system_template)
        else:
            return SystemMessage(content=system_template)

    def _create_human_message(
        self, query: MultimodalQuery, context: MultimodalContext
    ) -> BaseMessage:
        """Create human message with multimodal context"""
        # Build context content
        context_content = self._build_context_content(context)

        # Create message content
        message_content = [
            {
                "type": "text",
                "text": f"Question: {query.question}\n\nContext:\n{context_content}",
            }
        ]

        # Add any image content if available
        if query.image_assets and context.fused_content:
            # This would need to be enhanced to include actual image data
            message_content.append(
                {
                    "type": "text",
                    "text": f"\nImage assets referenced: {', '.join(query.image_assets)}",
                }
            )

        return HumanMessage(content=message_content)

    def _build_context_content(self, context: MultimodalContext) -> str:
        """Build context content from retrieved results"""
        if not context.retrieved_content.results:
            return "No relevant context found."

        content_parts = []

        # Add fused content if available
        if context.fused_content:
            content_parts.append(
                f"Fused Information:\n{context.fused_content.fused_content}\n"
            )

        # Add individual source information
        content_parts.append("Retrieved Sources:")

        for i, ranked_result in enumerate(
            context.retrieved_content.results[:5]
        ):  # Limit to top 5
            result = ranked_result.result
            content_parts.append(
                f"{i+1}. [{result.content_type.value}] {result.content[:200]}..."
            )

        return "\n".join(content_parts)

    def _get_content_types_involved(
        self, query: MultimodalQuery, context: MultimodalContext
    ) -> List[str]:
        """Get list of content types involved in the query"""
        types = set()

        # From query
        if query.text_content:
            types.add("text")
        if query.image_assets:
            types.add("image")
        if query.pdf_assets:
            types.add("pdf")
        if query.code_context:
            types.add("code")
        if query.web_urls:
            types.add("web")

        # From retrieved content
        for ranked_result in context.retrieved_content.results:
            types.add(ranked_result.result.content_type.value)

        return list(types)

    def _extract_sources(self, context: MultimodalContext) -> List[SearchResult]:
        """Extract source information from context"""
        sources = []

        # Add top ranked results as sources
        for ranked_result in context.retrieved_content.results[:3]:  # Top 3 sources
            sources.append(ranked_result.result)

        return sources

    def _calculate_confidence(self, context: MultimodalContext, response) -> float:
        """Calculate confidence score for the response"""
        # Base confidence from fusion
        base_confidence = 0.5

        if context.fused_content:
            base_confidence = context.fused_content.fusion_confidence

        # Adjust based on number of sources
        source_count = len(context.retrieved_content.results)
        if source_count > 0:
            source_confidence = min(source_count / 5.0, 1.0) * 0.3
        else:
            source_confidence = 0.0

        # Adjust based on response quality (simple heuristic)
        response_text = str(response.content)
        response_confidence = min(len(response_text) / 500.0, 1.0) * 0.2

        total_confidence = base_confidence + source_confidence + response_confidence

        return min(total_confidence, 1.0)
