# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

"""
Main multimodal agent for processing unified queries
"""

import asyncio
import json
from typing import List, Dict, Any, Optional
from logging import Logger

from .multimodal_types import (
    MultimodalQuery,
    ContentType,
    SearchStrategy,
    RetrievalResult,
    RankedResult,
    FusedResult,
    MultimodalContext,
    LLMResponse,
    VectorStoreConfig,
    LLMConfig,
    ProcessingConfig,
)
from .vector_store import MultimodalVectorStore
from .content_processor import ContentProcessor
from .retriever import MultimodalRetriever
from .llm_processor import MultimodalLLM
from .cross_modal_fuser import CrossModalFuser


class MultimodalAgent:
    """Main agent for processing multimodal queries"""

    def __init__(
        self,
        logger: Logger,
        ps3,  # SAGE3 API handle
        vector_store_config: Optional[VectorStoreConfig] = None,
        llm_config: Optional[LLMConfig] = None,
        processing_config: Optional[ProcessingConfig] = None,
    ):
        self.logger = logger
        self.ps3 = ps3

        # Initialize configurations
        self.vector_store_config = vector_store_config or VectorStoreConfig()
        self.llm_config = llm_config or self._load_llm_config()
        self.processing_config = processing_config or ProcessingConfig()

        # Initialize components
        self._init_components()

        # Log initialization
        self._log_initialization()

    def _load_llm_config(self) -> LLMConfig:
        """Load LLM configuration from SAGE3"""
        from libs.utils import getModelsInfo

        models = getModelsInfo(self.ps3)

        config = LLMConfig()

        # OpenAI configuration
        if models.get("openai", {}).get("apiKey"):
            config.openai_api_key = models["openai"]["apiKey"]
            config.openai_model = models["openai"]["model"]

        # Azure configuration
        if models.get("azure", {}).get("text", {}).get("apiKey"):
            config.azure_endpoint = models["azure"]["text"]["url"]
            config.azure_api_key = models["azure"]["text"]["apiKey"]
            config.azure_model = models["azure"]["text"]["model"]

        # Llama configuration
        if models.get("llama", {}).get("url"):
            config.llama_url = models["llama"]["url"]
            config.llama_model = models["llama"]["model"]

        return config

    def _init_components(self):
        """Initialize all processing components"""
        self.logger.info("Initializing multimodal components...")

        # Initialize vector store
        self.vector_store = MultimodalVectorStore(
            config=self.vector_store_config,
            llm_config=self.llm_config,
            logger=self.logger,
        )

        # Initialize content processor
        self.content_processor = ContentProcessor(
            config=self.processing_config, logger=self.logger
        )

        # Initialize retriever
        self.retriever = MultimodalRetriever(
            vector_store=self.vector_store, logger=self.logger
        )

        # Initialize LLM processor
        self.llm_processor = MultimodalLLM(config=self.llm_config, logger=self.logger)

        # Initialize cross-modal fuser
        self.fuser = CrossModalFuser(logger=self.logger)

        self.logger.info("All multimodal components initialized")

    def _log_initialization(self):
        """Log initialization status"""
        from libs.ai_logging import ai_logger

        ai_logger.emit(
            "init",
            {
                "agent": "multimodal",
                "openai": bool(self.llm_config.openai_api_key),
                "azure": bool(self.llm_config.azure_api_key),
                "llama": bool(self.llm_config.llama_url),
                "vector_store": "chromadb",
                "config": {
                    "image_size": self.processing_config.image_size,
                    "chunk_size": self.processing_config.chunk_size,
                    "max_tokens": self.llm_config.max_tokens,
                },
            },
        )

    async def process_query(self, query: MultimodalQuery) -> LLMResponse:
        """
        Process a multimodal query end-to-end

        Args:
            query: Multimodal query containing all content types

        Returns:
            LLMResponse with answer and actions
        """
        self.logger.info(
            f"Processing multimodal query from {query.user}: {query.question}"
        )

        try:
            # Step 1: Process and store any new content
            await self._process_and_store_content(query)

            # Step 2: Retrieve relevant content
            retrieval_result = await self.retriever.retrieve_relevant_content(query)

            # Step 3: Rank and fuse results
            ranked_results = await self.retriever.rank_results(retrieval_result.results)
            fused_result = await self.fuser.cross_modal_fusion(ranked_results)

            # Step 4: Create multimodal context
            context = MultimodalContext(
                query=query,
                retrieved_content=retrieval_result,
                fused_content=fused_result,
            )

            # Step 5: Process with LLM
            llm_response = await self.llm_processor.process_multimodal_query(
                query=query, context=context
            )

            # Step 6: Create actions
            actions = self._create_actions(llm_response, query.ctx.pos)
            llm_response.actions = actions

            self.logger.info(f"Successfully processed multimodal query: {query.id}")
            return llm_response

        except Exception as e:
            self.logger.error(
                f"Failed to process multimodal query: {str(e)}", exc_info=True
            )
            return self._create_error_response(str(e), query.ctx.pos)

    async def _process_and_store_content(self, query: MultimodalQuery):
        """Process and store any new content from the query"""
        tasks = []

        # Process text content
        if query.text_content:
            tasks.append(self._process_text_content(query.text_content, query))

        # Process image assets
        for asset_id in query.image_assets:
            tasks.append(self._process_image_asset(asset_id, query))

        # Process PDF assets
        for asset_id in query.pdf_assets:
            tasks.append(self._process_pdf_asset(asset_id, query))

        # Process code context
        if query.code_context:
            tasks.append(self._process_code_content(query.code_context, query))

        # Process web URLs
        for url in query.web_urls:
            tasks.append(self._process_web_content(url, query))

        # Execute all processing tasks
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _process_text_content(self, text: str, query: MultimodalQuery):
        """Process and store text content"""
        try:
            processed = await self.content_processor.process_text(text)
            await self.vector_store.store_text(
                text=processed.content,
                metadata={
                    "source": "user_input",
                    "user": query.user,
                    "query_id": query.id,
                },
            )
        except Exception as e:
            self.logger.error(f"Failed to process text content: {e}")

    async def _process_image_asset(self, asset_id: str, query: MultimodalQuery):
        """Process and store image asset"""
        try:
            from libs.utils import getImageFile

            image_content = getImageFile(self.ps3, asset_id)
            if image_content:
                processed = await self.content_processor.process_image(image_content)
                await self.vector_store.store_image(
                    image_bytes=image_content,
                    metadata={
                        "source": "sage3_asset",
                        "user": query.user,
                        "query_id": query.id,
                        "description": processed.content,
                    },
                    sage_asset_id=asset_id,
                )
        except Exception as e:
            self.logger.error(f"Failed to process image asset {asset_id}: {e}")

    async def _process_pdf_asset(self, asset_id: str, query: MultimodalQuery):
        """Process and store PDF asset"""
        try:
            from libs.utils import getPDFFile

            pdf_content = getPDFFile(self.ps3, asset_id)
            if pdf_content:
                processed = await self.content_processor.process_pdf(pdf_content)
                await self.vector_store.store_pdf(
                    pdf_content=pdf_content,
                    metadata={
                        "source": "sage3_asset",
                        "user": query.user,
                        "query_id": query.id,
                    },
                    sage_asset_id=asset_id,
                )
        except Exception as e:
            self.logger.error(f"Failed to process PDF asset {asset_id}: {e}")

    async def _process_code_content(self, code: str, query: MultimodalQuery):
        """Process and store code content"""
        try:
            processed = await self.content_processor.process_code(code)
            await self.vector_store.store_code(
                code=processed.content,
                metadata={
                    "source": "user_input",
                    "user": query.user,
                    "query_id": query.id,
                    "language": processed.metadata.get("language", "unknown"),
                },
            )
        except Exception as e:
            self.logger.error(f"Failed to process code content: {e}")

    async def _process_web_content(self, url: str, query: MultimodalQuery):
        """Process and store web content"""
        try:
            processed = await self.content_processor.process_web(url)
            await self.vector_store.store_text(
                text=processed.content,
                metadata={
                    "source": "web",
                    "user": query.user,
                    "query_id": query.id,
                    "url": url,
                },
            )
        except Exception as e:
            self.logger.error(f"Failed to process web content {url}: {e}")

    def _create_actions(
        self, response: LLMResponse, position: List[float]
    ) -> List[Dict[str, Any]]:
        """Create SAGE3 actions from LLM response"""
        actions = []

        # Create main answer action
        main_action = {
            "type": "create_app",
            "app": "Stickie",
            "state": {"text": response.answer, "fontSize": 16, "color": "purple"},
            "data": {
                "title": "Multimodal Answer",
                "position": {"x": position[0], "y": position[1], "z": 0},
                "size": {"width": 400, "height": 500, "depth": 0},
            },
        }
        actions.append(json.dumps(main_action))

        # Create source references if available
        if response.sources:
            sources_text = "Sources:\n" + "\n".join(
                [
                    f"- {source.content_type.value}: {source.source}"
                    for source in response.sources[:3]  # Limit to 3 sources
                ]
            )

            sources_action = {
                "type": "create_app",
                "app": "Stickie",
                "state": {"text": sources_text, "fontSize": 12, "color": "gray"},
                "data": {
                    "title": "Sources",
                    "position": {"x": position[0] + 450, "y": position[1], "z": 0},
                    "size": {"width": 200, "height": 200, "depth": 0},
                },
            }
            actions.append(json.dumps(sources_action))

        return actions

    def _create_error_response(
        self, error_message: str, position: List[float]
    ) -> LLMResponse:
        """Create error response"""
        action = {
            "type": "create_app",
            "app": "Stickie",
            "state": {
                "text": f"Error: {error_message}",
                "fontSize": 16,
                "color": "red",
            },
            "data": {
                "title": "Error",
                "position": {"x": position[0], "y": position[1], "z": 0},
                "size": {"width": 400, "height": 200, "depth": 0},
            },
        }

        return LLMResponse(
            answer=f"Failed to process multimodal query: {error_message}",
            confidence=0.0,
            sources=[],
            actions=[json.dumps(action)],
            metadata={"error": True},
        )

    async def get_stats(self) -> Dict[str, Any]:
        """Get system statistics"""
        return {
            "vector_store": self.vector_store.get_collection_stats(),
            "config": {
                "llm": {
                    "openai_available": bool(self.llm_config.openai_api_key),
                    "azure_available": bool(self.llm_config.azure_api_key),
                    "llama_available": bool(self.llm_config.llama_url),
                },
                "processing": {
                    "image_size": self.processing_config.image_size,
                    "chunk_size": self.processing_config.chunk_size,
                },
            },
        }

    async def close(self):
        """Clean up resources"""
        self.logger.info("Closing multimodal agent...")
        # Add cleanup logic here if needed
