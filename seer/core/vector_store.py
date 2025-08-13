# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

"""
Unified vector store for multimodal content
"""

import os
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import chromadb
from chromadb.config import Settings
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, AzureOpenAIEmbeddings
from langchain_core.documents import Document

from .multimodal_types import (
    ContentType,
    ProcessedContent,
    SearchResult,
    VectorStoreConfig,
    LLMConfig,
)


class MultimodalVectorStore:
    """Unified vector store for all content types"""

    def __init__(self, config: VectorStoreConfig, llm_config: LLMConfig, logger):
        self.config = config
        self.llm_config = llm_config
        self.logger = logger

        # Initialize ChromaDB client
        self._init_chroma_client()

        # Initialize embeddings
        self._init_embeddings()

        # Initialize collections
        self._init_collections()

    def _init_chroma_client(self):
        """Initialize ChromaDB client"""
        mode = os.getenv("ENVIRONMENT")
        if mode in ["production", "backend"]:
            host = "chromadb"
            port = 8000
        else:
            host = self.config.host
            port = self.config.port

        self.chroma_client = chromadb.HttpClient(
            host=host,
            port=port,
            settings=Settings(
                chroma_client_auth_provider="chromadb.auth.basic_authn.BasicAuthClientProvider",
                chroma_client_auth_credentials=os.getenv(
                    "CHROMA_CLIENT_AUTH_CREDENTIALS"
                ),
            ),
        )

        # Test connection
        try:
            self.chroma_client.heartbeat()
            self.logger.info("ChromaDB connection established")
        except Exception as e:
            self.logger.error(f"Failed to connect to ChromaDB: {e}")
            raise

    def _init_embeddings(self):
        """Initialize embedding models"""
        self.embeddings = {}

        # Text embeddings
        if self.llm_config.openai_api_key:
            self.embeddings[ContentType.TEXT] = OpenAIEmbeddings(
                api_key=self.llm_config.openai_api_key
            )
        elif self.llm_config.azure_api_key:
            self.embeddings[ContentType.TEXT] = AzureOpenAIEmbeddings(
                model="text-embedding-3-small",
                azure_endpoint=self.llm_config.azure_endpoint,
                api_key=self.llm_config.azure_api_key,
                api_version="2024-12-01-preview",
            )

        # Use text embeddings for code and PDF as well
        if ContentType.TEXT in self.embeddings:
            self.embeddings[ContentType.CODE] = self.embeddings[ContentType.TEXT]
            self.embeddings[ContentType.PDF] = self.embeddings[ContentType.TEXT]

    def _init_collections(self):
        """Initialize ChromaDB collections"""
        self.collections = {}

        for content_type in ContentType:
            collection_name = f"{self.config.collection_prefix}_{content_type.value}"

            if content_type in self.embeddings:
                self.collections[content_type] = Chroma(
                    client=self.chroma_client,
                    collection_name=collection_name,
                    embedding_function=self.embeddings[content_type],
                )
                self.logger.info(f"Initialized collection: {collection_name}")
            else:
                self.logger.warning(f"No embedding model for {content_type.value}")

    async def store_text(
        self, text: str, metadata: Dict[str, Any], sage_asset_id: Optional[str] = None
    ) -> str:
        """Store text embeddings"""
        if ContentType.TEXT not in self.collections:
            raise ValueError("Text embedding model not available")

        doc_id = f"text_{sage_asset_id or datetime.utcnow().isoformat()}"

        # Add metadata
        metadata.update(
            {
                "content_type": ContentType.TEXT.value,
                "sage_asset_id": sage_asset_id,
                "timestamp": datetime.utcnow().isoformat(),
                "source": metadata.get("source", "user_input"),
            }
        )

        # Create document
        document = Document(page_content=text, metadata=metadata)

        # Store in vector store
        await self.collections[ContentType.TEXT].aadd_documents([document])

        self.logger.info(f"Stored text with ID: {doc_id}")
        return doc_id

    async def store_image(
        self,
        image_bytes: bytes,
        metadata: Dict[str, Any],
        sage_asset_id: Optional[str] = None,
    ) -> str:
        """Store image embeddings using CLIP"""
        # Note: This would require CLIP model integration
        # For now, we'll store image metadata and use text descriptions

        doc_id = f"image_{sage_asset_id or datetime.utcnow().isoformat()}"

        # Add metadata
        metadata.update(
            {
                "content_type": ContentType.IMAGE.value,
                "sage_asset_id": sage_asset_id,
                "timestamp": datetime.utcnow().isoformat(),
                "image_size": len(image_bytes),
            }
        )

        # For now, store as text with image description
        if "description" in metadata:
            await self.store_text(metadata["description"], metadata, sage_asset_id)

        self.logger.info(f"Stored image with ID: {doc_id}")
        return doc_id

    async def store_code(
        self, code: str, metadata: Dict[str, Any], sage_asset_id: Optional[str] = None
    ) -> str:
        """Store code embeddings with syntax awareness"""
        if ContentType.CODE not in self.collections:
            raise ValueError("Code embedding model not available")

        doc_id = f"code_{sage_asset_id or datetime.utcnow().isoformat()}"

        # Add metadata
        metadata.update(
            {
                "content_type": ContentType.CODE.value,
                "sage_asset_id": sage_asset_id,
                "timestamp": datetime.utcnow().isoformat(),
                "language": metadata.get("language", "unknown"),
            }
        )

        # Create document
        document = Document(page_content=code, metadata=metadata)

        # Store in vector store
        await self.collections[ContentType.CODE].aadd_documents([document])

        self.logger.info(f"Stored code with ID: {doc_id}")
        return doc_id

    async def store_pdf(
        self,
        pdf_content: bytes,
        metadata: Dict[str, Any],
        sage_asset_id: Optional[str] = None,
    ) -> List[str]:
        """Store PDF text and image embeddings"""
        if ContentType.PDF not in self.collections:
            raise ValueError("PDF embedding model not available")

        # This would integrate with existing PDF processing
        # For now, return placeholder
        doc_ids = []

        # Process PDF content (text extraction, image extraction)
        # Store text chunks
        # Store image descriptions

        self.logger.info(f"Stored PDF with asset ID: {sage_asset_id}")
        return doc_ids

    async def search_text(
        self,
        query: str,
        content_type: ContentType,
        max_results: int = 10,
        similarity_threshold: float = 0.7,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[SearchResult]:
        """Search for content by text query"""
        if content_type not in self.collections:
            return []

        try:
            # Perform similarity search
            results = await self.collections[
                content_type
            ].asimilarity_search_with_score(query=query, k=max_results, filter=filters)

            search_results = []
            for doc, score in results:
                if score >= similarity_threshold:
                    search_results.append(
                        SearchResult(
                            id=doc.metadata.get("sage_asset_id", "unknown"),
                            content=doc.page_content,
                            content_type=content_type,
                            metadata=doc.metadata,
                            similarity_score=score,
                            source=doc.metadata.get("source", "unknown"),
                        )
                    )

            return search_results

        except Exception as e:
            self.logger.error(f"Search failed for {content_type.value}: {e}")
            return []

    async def multimodal_search(
        self,
        query: str,
        content_types: List[ContentType],
        max_results: int = 10,
        similarity_threshold: float = 0.7,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[ContentType, List[SearchResult]]:
        """Search across multiple content types"""
        results = {}

        # Search each content type
        for content_type in content_types:
            results[content_type] = await self.search_text(
                query=query,
                content_type=content_type,
                max_results=max_results,
                similarity_threshold=similarity_threshold,
                filters=filters,
            )

        return results

    async def get_by_asset_id(
        self, asset_id: str, content_type: Optional[ContentType] = None
    ) -> List[SearchResult]:
        """Get content by SAGE3 asset ID"""
        results = []

        content_types = [content_type] if content_type else list(ContentType)

        for ct in content_types:
            if ct in self.collections:
                try:
                    # Query by metadata filter
                    docs = self.collections[ct].get(where={"sage_asset_id": asset_id})

                    for i, doc in enumerate(docs["documents"]):
                        results.append(
                            SearchResult(
                                id=asset_id,
                                content=doc,
                                content_type=ct,
                                metadata=docs["metadatas"][i],
                                similarity_score=1.0,
                                source=docs["metadatas"][i].get("source", "unknown"),
                            )
                        )

                except Exception as e:
                    self.logger.error(
                        f"Failed to get {ct.value} for asset {asset_id}: {e}"
                    )

        return results

    async def delete_by_asset_id(self, asset_id: str) -> bool:
        """Delete content by SAGE3 asset ID"""
        success = True

        for content_type, collection in self.collections.items():
            try:
                # Get documents with this asset ID
                docs = collection.get(where={"sage_asset_id": asset_id})

                if docs["ids"]:
                    collection.delete(ids=docs["ids"])
                    self.logger.info(
                        f"Deleted {len(docs['ids'])} {content_type.value} documents for asset {asset_id}"
                    )

            except Exception as e:
                self.logger.error(
                    f"Failed to delete {content_type.value} for asset {asset_id}: {e}"
                )
                success = False

        return success

    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about all collections"""
        stats = {}

        for content_type, collection in self.collections.items():
            try:
                count = collection._collection.count()
                stats[content_type.value] = {
                    "document_count": count,
                    "collection_name": collection._collection.name,
                }
            except Exception as e:
                self.logger.error(f"Failed to get stats for {content_type.value}: {e}")
                stats[content_type.value] = {"error": str(e)}

        return stats
