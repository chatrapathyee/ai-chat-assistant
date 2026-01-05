"""
PDF processing service.
Handles PDF upload, text extraction, and page-level indexing.
"""

import os
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import pdfplumber
from PyPDF2 import PdfReader
import aiofiles
import aiofiles.os

from app.models import PDFMetadata, PDFPageContent, PDFHighlight


class PDFService:
    """Service for processing and managing PDF documents."""
    
    def __init__(self, storage_path: str):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self._metadata_cache: Dict[str, PDFMetadata] = {}
        self._page_content_cache: Dict[str, Dict[int, str]] = {}
    
    async def save_pdf(self, content: bytes, filename: str) -> PDFMetadata:
        """
        Save a PDF file and extract its metadata and text content.
        
        Args:
            content: PDF file content as bytes
            filename: Original filename
            
        Returns:
            PDFMetadata with extracted information
        """
        # Generate unique PDF ID based on content hash
        pdf_id = hashlib.md5(content).hexdigest()[:16]
        
        # Save file to storage
        file_path = self.storage_path / f"{pdf_id}.pdf"
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Extract text and metadata
        metadata = await self._process_pdf(pdf_id, file_path, filename, len(content))
        
        # Cache the metadata
        self._metadata_cache[pdf_id] = metadata
        self._page_content_cache[pdf_id] = metadata.text_content
        
        return metadata
    
    async def _process_pdf(
        self, 
        pdf_id: str, 
        file_path: Path, 
        filename: str,
        file_size: int
    ) -> PDFMetadata:
        """
        Process a PDF file and extract text content per page.
        
        Uses pdfplumber for better text extraction quality.
        """
        text_content: Dict[int, str] = {}
        title = filename.replace('.pdf', '').replace('_', ' ').title()
        
        try:
            with pdfplumber.open(file_path) as pdf:
                page_count = len(pdf.pages)
                
                for i, page in enumerate(pdf.pages):
                    page_text = page.extract_text() or ""
                    text_content[i + 1] = page_text  # 1-indexed pages
                    
                    # Try to extract title from first page if not set
                    if i == 0 and page_text:
                        first_line = page_text.split('\n')[0].strip()
                        if first_line and len(first_line) < 100:
                            title = first_line
        
        except Exception as e:
            # Fallback to PyPDF2 if pdfplumber fails
            reader = PdfReader(str(file_path))
            page_count = len(reader.pages)
            
            for i, page in enumerate(reader.pages):
                text_content[i + 1] = page.extract_text() or ""
        
        return PDFMetadata(
            pdf_id=pdf_id,
            filename=filename,
            title=title,
            page_count=page_count,
            file_size=file_size,
            text_content=text_content,
            upload_date=datetime.utcnow()
        )
    
    def get_metadata(self, pdf_id: str) -> Optional[PDFMetadata]:
        """Get cached metadata for a PDF."""
        return self._metadata_cache.get(pdf_id)
    
    def get_page_content(self, pdf_id: str, page_number: int) -> Optional[PDFPageContent]:
        """Get the text content of a specific page."""
        if pdf_id not in self._page_content_cache:
            return None
        
        page_texts = self._page_content_cache[pdf_id]
        if page_number not in page_texts:
            return None
        
        return PDFPageContent(
            pdf_id=pdf_id,
            page_number=page_number,
            text=page_texts[page_number]
        )
    
    def search_in_pdf(
        self, 
        pdf_id: str, 
        query: str,
        max_results: int = 5
    ) -> List[Tuple[int, str, int, int]]:
        """
        Search for text in a PDF.
        
        Returns:
            List of tuples: (page_number, snippet, start_pos, end_pos)
        """
        if pdf_id not in self._page_content_cache:
            return []
        
        results = []
        query_lower = query.lower()
        
        for page_num, text in self._page_content_cache[pdf_id].items():
            text_lower = text.lower()
            start = 0
            
            while True:
                pos = text_lower.find(query_lower, start)
                if pos == -1:
                    break
                
                # Extract snippet with context
                snippet_start = max(0, pos - 50)
                snippet_end = min(len(text), pos + len(query) + 50)
                snippet = text[snippet_start:snippet_end]
                
                if snippet_start > 0:
                    snippet = "..." + snippet
                if snippet_end < len(text):
                    snippet = snippet + "..."
                
                results.append((page_num, snippet, pos, pos + len(query)))
                start = pos + 1
                
                if len(results) >= max_results:
                    return results
        
        return results
    
    def get_relevant_pages(
        self, 
        pdf_id: str, 
        keywords: List[str],
        max_pages: int = 3
    ) -> List[int]:
        """
        Find pages most relevant to given keywords.
        
        Returns list of page numbers sorted by relevance.
        """
        if pdf_id not in self._page_content_cache:
            return []
        
        page_scores: Dict[int, int] = {}
        
        for page_num, text in self._page_content_cache[pdf_id].items():
            text_lower = text.lower()
            score = 0
            
            for keyword in keywords:
                score += text_lower.count(keyword.lower())
            
            if score > 0:
                page_scores[page_num] = score
        
        # Sort by score descending
        sorted_pages = sorted(page_scores.items(), key=lambda x: x[1], reverse=True)
        return [page for page, _ in sorted_pages[:max_pages]]
    
    def get_pdf_path(self, pdf_id: str) -> Optional[Path]:
        """Get the file path for a PDF."""
        file_path = self.storage_path / f"{pdf_id}.pdf"
        if file_path.exists():
            return file_path
        return None
    
    def get_all_pdfs(self) -> List[PDFMetadata]:
        """Get metadata for all stored PDFs."""
        return list(self._metadata_cache.values())
    
    async def clear_all(self):
        """Clear all PDFs from storage and cache."""
        # Delete all PDF files
        for file_path in self.storage_path.glob("*.pdf"):
            try:
                await aiofiles.os.remove(file_path)
            except Exception as e:
                print(f"Error deleting {file_path}: {e}")
        
        # Clear caches
        self._metadata_cache.clear()
        self._page_content_cache.clear()
    
    async def load_existing_pdfs(self):
        """Load metadata for PDFs already in storage."""
        if not self.storage_path.exists():
            return
        
        for file_path in self.storage_path.glob("*.pdf"):
            pdf_id = file_path.stem
            if pdf_id not in self._metadata_cache:
                try:
                    async with aiofiles.open(file_path, 'rb') as f:
                        content = await f.read()
                    
                    metadata = await self._process_pdf(
                        pdf_id, 
                        file_path, 
                        file_path.name,
                        len(content)
                    )
                    self._metadata_cache[pdf_id] = metadata
                    self._page_content_cache[pdf_id] = metadata.text_content
                except Exception as e:
                    print(f"Error loading PDF {pdf_id}: {e}")


# Global PDF service instance (initialized in main.py)
pdf_service: Optional[PDFService] = None


def get_pdf_service() -> PDFService:
    """Get the global PDF service instance."""
    global pdf_service
    if pdf_service is None:
        raise RuntimeError("PDF service not initialized")
    return pdf_service


def init_pdf_service(storage_path: str) -> PDFService:
    """Initialize the global PDF service."""
    global pdf_service
    pdf_service = PDFService(storage_path)
    return pdf_service
