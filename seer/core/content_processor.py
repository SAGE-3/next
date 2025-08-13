# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

"""
Content processor for different modalities
"""

import asyncio
import base64
from typing import Dict, Any, Optional
from logging import Logger
from io import BytesIO

from PIL import Image
import httpx
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from .multimodal_types import ContentType, ProcessedContent, ProcessingConfig


class ContentProcessor:
    """Unified content processing for all modalities"""

    def __init__(self, config: ProcessingConfig, logger: Logger):
        self.config = config
        self.logger = logger
        self.httpx_client = httpx.AsyncClient(timeout=30.0)

        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.chunk_size, chunk_overlap=config.chunk_overlap
        )

    async def process_text(self, text: str) -> ProcessedContent:
        """Process text content"""
        try:
            # Basic text cleaning
            cleaned_text = text.strip()

            # Split into chunks if too long
            if len(cleaned_text) > self.config.chunk_size:
                chunks = self.text_splitter.split_text(cleaned_text)
                # Use first chunk for now, could be enhanced to process all chunks
                processed_text = chunks[0]
            else:
                processed_text = cleaned_text

            return ProcessedContent(
                content_type=ContentType.TEXT,
                content=processed_text,
                metadata={
                    "original_length": len(text),
                    "processed_length": len(processed_text),
                    "language": "en",  # Could add language detection
                },
            )

        except Exception as e:
            self.logger.error(f"Failed to process text: {e}")
            raise

    async def process_image(self, image_bytes: bytes) -> ProcessedContent:
        """Process image content with OCR and visual analysis"""
        try:
            # Load and process image
            image = Image.open(BytesIO(image_bytes))

            # Convert to RGB if needed
            if image.mode != "RGB":
                image = image.convert("RGB")

            # Resize image
            image = self._resize_image(image)

            # Generate description (placeholder for now)
            # In a real implementation, this would use a vision model
            description = self._generate_image_description(image)

            # Convert back to bytes
            output_buffer = BytesIO()
            image.save(output_buffer, format="JPEG")
            processed_bytes = output_buffer.getvalue()

            return ProcessedContent(
                content_type=ContentType.IMAGE,
                content=description,  # Store description as content
                metadata={
                    "original_size": len(image_bytes),
                    "processed_size": len(processed_bytes),
                    "dimensions": image.size,
                    "format": "JPEG",
                    "description": description,
                },
            )

        except Exception as e:
            self.logger.error(f"Failed to process image: {e}")
            raise

    async def process_pdf(self, pdf_bytes: bytes) -> ProcessedContent:
        """Process PDF with text extraction and image analysis"""
        try:
            # Import PDF processing libraries
            import pymupdf4llm
            import pymupdf

            # Extract text from PDF
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")

            text_content = ""
            image_descriptions = []

            for page_num in range(len(doc)):
                page = doc[page_num]

                # Extract text
                text = page.get_text()
                text_content += f"\n--- Page {page_num + 1} ---\n{text}\n"

                # Extract images (placeholder)
                # In a real implementation, this would process images
                images = page.get_images()
                if images:
                    image_descriptions.append(
                        f"Page {page_num + 1}: {len(images)} images found"
                    )

            doc.close()

            # Clean and process text
            cleaned_text = text_content.strip()

            # Split into chunks if too long
            if len(cleaned_text) > self.config.chunk_size:
                chunks = self.text_splitter.split_text(cleaned_text)
                processed_text = "\n\n".join(chunks[:3])  # Use first 3 chunks
            else:
                processed_text = cleaned_text

            return ProcessedContent(
                content_type=ContentType.PDF,
                content=processed_text,
                metadata={
                    "original_size": len(pdf_bytes),
                    "pages": len(doc),
                    "images_found": len(image_descriptions),
                    "image_descriptions": image_descriptions,
                },
            )

        except Exception as e:
            self.logger.error(f"Failed to process PDF: {e}")
            raise

    async def process_code(self, code: str) -> ProcessedContent:
        """Process code with syntax analysis and documentation"""
        try:
            # Basic code cleaning
            cleaned_code = code.strip()

            # Detect language (simple heuristic)
            language = self._detect_language(cleaned_code)

            # Extract function/class names (simple regex)
            import re

            functions = re.findall(r"def\s+(\w+)", cleaned_code)
            classes = re.findall(r"class\s+(\w+)", cleaned_code)

            # Create enhanced content with metadata
            enhanced_content = f"Language: {language}\n"
            if functions:
                enhanced_content += f"Functions: {', '.join(functions)}\n"
            if classes:
                enhanced_content += f"Classes: {', '.join(classes)}\n"
            enhanced_content += f"\nCode:\n{cleaned_code}"

            return ProcessedContent(
                content_type=ContentType.CODE,
                content=enhanced_content,
                metadata={
                    "language": language,
                    "functions": functions,
                    "classes": classes,
                    "lines": len(cleaned_code.split("\n")),
                    "characters": len(cleaned_code),
                },
            )

        except Exception as e:
            self.logger.error(f"Failed to process code: {e}")
            raise

    async def process_web(self, url: str) -> ProcessedContent:
        """Process web content with text and image extraction"""
        try:
            # Fetch web content
            response = await self.httpx_client.get(url)
            response.raise_for_status()

            # Extract text content (simplified)
            import html2text

            h = html2text.HTML2Text()
            h.ignore_links = False
            h.ignore_images = False

            text_content = h.handle(response.text)

            # Clean and process text
            cleaned_text = text_content.strip()

            # Limit content length
            if len(cleaned_text) > self.config.chunk_size * 3:
                cleaned_text = cleaned_text[: self.config.chunk_size * 3] + "..."

            return ProcessedContent(
                content_type=ContentType.WEB,
                content=cleaned_text,
                metadata={
                    "url": url,
                    "status_code": response.status_code,
                    "content_type": response.headers.get("content-type", ""),
                    "original_length": len(response.text),
                    "processed_length": len(cleaned_text),
                },
            )

        except Exception as e:
            self.logger.error(f"Failed to process web content {url}: {e}")
            raise

    def _resize_image(self, image: Image.Image) -> Image.Image:
        """Resize image to standard size"""
        # Calculate new dimensions maintaining aspect ratio
        width, height = image.size
        if width > height:
            new_width = self.config.image_size
            new_height = int(height * (self.config.image_size / width))
        else:
            new_height = self.config.image_size
            new_width = int(width * (self.config.image_size / height))

        return image.resize((new_width, new_height), Image.Resampling.LANCZOS)

    def _generate_image_description(self, image: Image.Image) -> str:
        """Generate description for image (placeholder)"""
        # This is a placeholder - in a real implementation, this would use a vision model
        width, height = image.size
        return f"Image with dimensions {width}x{height} pixels"

    def _detect_language(self, code: str) -> str:
        """Detect programming language from code"""
        # Simple heuristic-based detection
        if "def " in code or "import " in code or "print(" in code:
            return "python"
        elif "function " in code or "var " in code or "const " in code:
            return "javascript"
        elif "public class" in code or "public static void main" in code:
            return "java"
        elif "#include" in code or "int main(" in code:
            return "cpp"
        elif "using System;" in code or "namespace " in code:
            return "csharp"
        else:
            return "unknown"

    async def close(self):
        """Clean up resources"""
        await self.httpx_client.aclose()
