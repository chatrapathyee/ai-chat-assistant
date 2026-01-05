"""
PDF API routes.
Handles PDF upload, retrieval, and viewing.
"""

import os
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse

from app.models import PDFUploadResponse, PDFMetadata, PDFPageContent
from app.services.pdf_service import get_pdf_service

router = APIRouter(prefix="/pdf", tags=["pdf"])


@router.post("/upload", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file for processing and citation.
    
    The PDF will be processed to extract text content for each page,
    enabling citation and search functionality.
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Only PDF files are allowed"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size (max 50MB)
    max_size = 50 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB"
        )
    
    try:
        pdf_service = get_pdf_service()
        metadata = await pdf_service.save_pdf(content, file.filename)
        
        return PDFUploadResponse(
            pdf_id=metadata.pdf_id,
            filename=metadata.filename,
            page_count=metadata.page_count,
            status="processed"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


@router.get("/list", response_model=List[PDFMetadata])
async def list_pdfs():
    """Get a list of all uploaded PDFs."""
    pdf_service = get_pdf_service()
    pdfs = pdf_service.get_all_pdfs()
    
    # Return metadata without full text content
    return [
        PDFMetadata(
            pdf_id=pdf.pdf_id,
            filename=pdf.filename,
            title=pdf.title,
            page_count=pdf.page_count,
            upload_date=pdf.upload_date,
            file_size=pdf.file_size,
            text_content={}  # Don't send full text in list
        )
        for pdf in pdfs
    ]


@router.delete("/clear-all")
async def clear_all_pdfs():
    """Clear all uploaded PDFs. Used when frontend reloads for fresh start."""
    pdf_service = get_pdf_service()
    await pdf_service.clear_all()
    return {"status": "success", "message": "All PDFs cleared"}


@router.get("/{pdf_id}", response_model=PDFMetadata)
async def get_pdf_metadata(pdf_id: str):
    """Get metadata for a specific PDF."""
    pdf_service = get_pdf_service()
    metadata = pdf_service.get_metadata(pdf_id)
    
    if not metadata:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    return metadata


@router.get("/{pdf_id}/file")
async def get_pdf_file(pdf_id: str):
    """
    Get the actual PDF file for viewing.
    
    Returns the PDF file with appropriate headers for browser viewing.
    """
    pdf_service = get_pdf_service()
    file_path = pdf_service.get_pdf_path(pdf_id)
    
    if not file_path:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    metadata = pdf_service.get_metadata(pdf_id)
    filename = metadata.filename if metadata else f"{pdf_id}.pdf"
    
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename,
        headers={
            "Content-Disposition": f"inline; filename={filename}"
        }
    )


@router.get("/{pdf_id}/page/{page_number}", response_model=PDFPageContent)
async def get_pdf_page(pdf_id: str, page_number: int):
    """Get the text content of a specific PDF page."""
    pdf_service = get_pdf_service()
    page_content = pdf_service.get_page_content(pdf_id, page_number)
    
    if not page_content:
        raise HTTPException(
            status_code=404, 
            detail="Page not found or PDF doesn't exist"
        )
    
    return page_content


@router.get("/{pdf_id}/search")
async def search_pdf(pdf_id: str, q: str, max_results: int = 10):
    """
    Search for text within a specific PDF.
    
    Returns matching snippets with page numbers and positions.
    """
    if not q or len(q) < 2:
        raise HTTPException(
            status_code=400,
            detail="Search query must be at least 2 characters"
        )
    
    pdf_service = get_pdf_service()
    
    if not pdf_service.get_metadata(pdf_id):
        raise HTTPException(status_code=404, detail="PDF not found")
    
    results = pdf_service.search_in_pdf(pdf_id, q, max_results)
    
    return {
        "pdf_id": pdf_id,
        "query": q,
        "results": [
            {
                "page_number": page,
                "snippet": snippet,
                "start_position": start,
                "end_position": end
            }
            for page, snippet, start, end in results
        ]
    }
