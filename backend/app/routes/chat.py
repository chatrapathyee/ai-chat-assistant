"""
Chat API routes.
Handles chat messages and streaming responses.
"""

import json
from typing import List
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models import (
    ChatRequest, 
    ChatMessage, 
    JobResponse,
    ErrorResponse
)
from app.services.ai_service import get_ai_service
from app.services.queue_service import get_queue_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message", response_model=JobResponse)
async def send_message(request: ChatRequest):
    """
    Send a chat message and get a job ID for streaming response.
    
    The response is processed asynchronously and streamed via SSE.
    Use the returned stream_url to connect to the SSE endpoint.
    """
    try:
        queue_service = get_queue_service()
        
        # Enqueue the chat job
        job = await queue_service.enqueue(
            task_type="chat",
            payload={
                'message': request.message,
                'history': [msg.model_dump() for msg in request.history],
                'conversation_id': request.conversation_id
            }
        )
        
        return JobResponse(
            job_id=job.id,
            status="queued",
            stream_url=f"/api/chat/stream/{job.id}"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stream/{job_id}")
async def stream_response(job_id: str):
    """
    Stream the chat response via Server-Sent Events (SSE).
    
    Connect to this endpoint after sending a message to receive
    real-time streaming response chunks.
    """
    queue_service = get_queue_service()
    job = queue_service.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    async def generate():
        """Generate SSE events from job results."""
        async for chunk in queue_service.get_result_stream(job_id):
            yield chunk
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable buffering for nginx
        }
    )


@router.options("/stream")
async def stream_options():
    """Handle OPTIONS requests for CORS preflight."""
    return {"message": "OK"}


@router.post("/stream")
async def stream_message_direct(request: ChatRequest):
    """
    Direct streaming endpoint without queue.
    
    For simpler use cases where queue-based processing isn't needed.
    Returns SSE stream directly.
    """
    try:
        ai_service = get_ai_service()
        
        async def generate():
            async for chunk in ai_service.generate_streaming_response(
                request.message,
                request.history,
                request.pdf_ids
            ):
                yield chunk
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of a chat job."""
    queue_service = get_queue_service()
    job = queue_service.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job.to_dict()
