# Seer Multimodal Architecture

## Overview

This document describes the new multimodal architecture for the Seer application, which enables unified processing of queries across text, images, PDFs, code, and web content using a single API endpoint.

## Architecture Components

### 1. Core Components (`core/`)

- **`multimodal_types.py`**: Data models and type definitions
- **`multimodal_agent.py`**: Main orchestrator for multimodal processing
- **`vector_store.py`**: Unified ChromaDB vector store for all content types
- **`content_processor.py`**: Content processing for different modalities
- **`retriever.py`**: Intelligent retrieval and ranking system
- **`llm_processor.py`**: Unified LLM interface
- **`cross_modal_fuser.py`**: Cross-modal information fusion

### 2. Key Features

#### Unified Query Interface
- Single endpoint (`/multimodal`) for all content types
- Support for mixed content in single query
- Flexible search strategies (semantic, keyword, hybrid, cross-modal)

#### Intelligent Retrieval
- Automatic content type detection
- Relevance and diversity ranking
- Cross-modal information fusion
- Confidence scoring

#### Vector Store Integration
- Unified ChromaDB collections for all content types
- Efficient similarity search
- Metadata-rich storage
- Asset-based organization

## API Usage

### Basic Multimodal Query

```python
from core import MultimodalQuery, Context

query = MultimodalQuery(
    ctx=Context(
        previousQ="",
        previousA="",
        pos=[100.0, 200.0],
        roomId="room123",
        boardId="board456"
    ),
    user="alice",
    location="Hawaii",
    model="openai",
    text_content="What is machine learning?",
    question="Explain the basics of machine learning and its applications."
)
```

### API Endpoints

#### POST `/multimodal`
Process multimodal queries

**Request Body:**
```json
{
  "ctx": {
    "previousQ": "",
    "previousA": "",
    "pos": [100.0, 200.0],
    "roomId": "room123",
    "boardId": "board456"
  },
  "user": "alice",
  "location": "Hawaii",
  "model": "openai",
  "text_content": "Optional text content",
  "image_assets": ["asset_id_1", "asset_id_2"],
  "pdf_assets": ["pdf_asset_1"],
  "code_context": "Optional code snippet",
  "web_urls": ["https://example.com"],
  "question": "Your question here",
  "search_strategy": "hybrid",
  "max_results": 10,
  "similarity_threshold": 0.7
}
```

**Response:**
```json
{
  "answer": "Comprehensive answer with markdown formatting",
  "confidence": 0.85,
  "sources": [
    {
      "id": "asset_123",
      "content": "Source content",
      "content_type": "text",
      "metadata": {...},
      "similarity_score": 0.92,
      "source": "sage3_asset"
    }
  ],
  "actions": [
    "JSON string for SAGE3 action"
  ],
  "metadata": {
    "model_used": "openai",
    "context_size": 5,
    "fusion_confidence": 0.78
  }
}
```

#### GET `/multimodal/stats`
Get system statistics

**Response:**
```json
{
  "success": true,
  "stats": {
    "vector_store": {
      "text": {"document_count": 150, "collection_name": "multimodal_text"},
      "image": {"document_count": 25, "collection_name": "multimodal_image"},
      "pdf": {"document_count": 30, "collection_name": "multimodal_pdf"},
      "code": {"document_count": 45, "collection_name": "multimodal_code"}
    },
    "config": {
      "llm": {
        "openai_available": true,
        "azure_available": true,
        "llama_available": false
      },
      "processing": {
        "image_size": 600,
        "chunk_size": 1000
      }
    }
  }
}
```

## Query Examples

### 1. Text-Only Query
```python
query = MultimodalQuery(
    ctx=context,
    user="user1",
    location="Hawaii",
    model="openai",
    text_content="What is machine learning?",
    question="Explain the basics of machine learning."
)
```

### 2. Image Analysis
```python
query = MultimodalQuery(
    ctx=context,
    user="user2",
    location="Chicago",
    model="azure",
    image_assets=["image_asset_123"],
    question="What do you see in this image?"
)
```

### 3. PDF Document Analysis
```python
query = MultimodalQuery(
    ctx=context,
    user="user3",
    location="Virginia",
    model="openai",
    pdf_assets=["pdf_asset_456"],
    question="Summarize the key findings from this document."
)
```

### 4. Code Analysis
```python
query = MultimodalQuery(
    ctx=context,
    user="user4",
    location="Hawaii",
    model="llama",
    code_context="def process_data(data): return [x*2 for x in data if x > 0]",
    question="What does this code do? Can you suggest improvements?"
)
```

### 5. Complex Multimodal Query
```python
query = MultimodalQuery(
    ctx=context,
    user="user5",
    location="Chicago",
    model="azure",
    text_content="I'm working on a data science project",
    image_assets=["chart_asset_789"],
    pdf_assets=["research_paper_101"],
    code_context="import pandas as pd; df.plot()",
    web_urls=["https://example.com/guide"],
    question="Based on all this information, how can I improve my workflow?"
)
```

## Configuration

### Vector Store Configuration
```python
from core import VectorStoreConfig

config = VectorStoreConfig(
    host="127.0.0.1",
    port=8100,
    collection_prefix="multimodal",
    embedding_dimensions={
        ContentType.TEXT: 1536,
        ContentType.IMAGE: 512,
        ContentType.CODE: 1536,
        ContentType.PDF: 1536
    }
)
```

### LLM Configuration
```python
from core import LLMConfig

config = LLMConfig(
    openai_api_key="your_openai_key",
    openai_model="gpt-4o-mini",
    azure_endpoint="your_azure_endpoint",
    azure_api_key="your_azure_key",
    azure_model="gpt-4o-mini",
    llama_url="your_llama_url",
    llama_model="llama-3.1-8b",
    max_tokens=2000,
    temperature=0.7
)
```

### Processing Configuration
```python
from core import ProcessingConfig

config = ProcessingConfig(
    image_size=600,
    chunk_size=1000,
    chunk_overlap=200,
    max_file_size=50 * 1024 * 1024,  # 50MB
    supported_image_formats=["jpg", "jpeg", "png", "webp"],
    supported_pdf_formats=["pdf"],
    supported_code_languages=["python", "javascript", "java", "cpp", "csharp"]
)
```

## Migration from Old Architecture

### Backward Compatibility
- All existing endpoints (`/ask`, `/image`, `/pdf`, `/code`, `/web`) remain functional
- Gradual migration path available
- Feature flags for new capabilities

### Data Migration
- Existing ChromaDB data preserved
- New multimodal collections created alongside existing ones
- Asset IDs maintained for compatibility

### Testing
- Comprehensive unit tests for new components
- Integration tests for multimodal queries
- Performance benchmarking

## Benefits

### 1. True Multimodal Capabilities
- Query across text, images, PDFs, and code simultaneously
- Cross-modal information fusion
- Context-aware responses

### 2. Improved User Experience
- Single query interface for all modalities
- More relevant and comprehensive responses
- Better context understanding

### 3. Scalability
- Modular design for easy extension
- Efficient vector storage
- Parallel processing capabilities

### 4. Maintainability
- Unified codebase
- Shared components
- Better testing capabilities

## Future Enhancements

### 1. Advanced Features
- Real-time multimodal conversation memory
- Advanced cross-modal fusion algorithms
- Custom embedding models for specific domains

### 2. Performance Optimizations
- Caching for frequently accessed content
- Streaming responses for large queries
- Distributed processing for high-volume workloads

### 3. Additional Modalities
- Audio/video processing
- 3D model analysis
- Real-time sensor data integration

## Getting Started

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Server**
   ```bash
   python main.py
   ```

3. **Test the API**
   ```bash
   # Run example queries
   python examples/multimodal_example.py
   
   # Check API documentation
   curl http://localhost:9999/docs
   ```

4. **Send a Query**
   ```bash
   curl -X POST "http://localhost:9999/multimodal" \
        -H "Content-Type: application/json" \
        -d @query_example.json
   ```

## Support

For questions or issues with the multimodal architecture:
- Check the API documentation at `/docs`
- Review the example scripts in `examples/`
- Examine the architecture proposal in `architecture_proposal.md`
