"""
Queue service for managing async job processing.
Uses asyncio.Queue for in-memory queue management.
"""

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional, Callable, Awaitable
import logging

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    """Status of a queued job."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class Job:
    """Represents a job in the queue."""
    id: str
    task_type: str
    payload: Dict[str, Any]
    status: JobStatus = JobStatus.QUEUED
    result: Any = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert job to dictionary."""
        return {
            'id': self.id,
            'task_type': self.task_type,
            'status': self.status.value,
            'error': self.error,
            'created_at': self.created_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }


class QueueService:
    """
    In-memory async queue service for managing chat generation jobs.
    
    Features:
    - Async job queue with configurable concurrency
    - Job status tracking
    - Streaming result retrieval via SSE
    """
    
    def __init__(self, max_workers: int = 3):
        self.max_workers = max_workers
        self._queue: asyncio.Queue[Job] = asyncio.Queue()
        self._jobs: Dict[str, Job] = {}
        self._result_queues: Dict[str, asyncio.Queue] = {}
        self._workers_started = False
        self._shutdown = False
    
    async def start_workers(self):
        """Start background worker tasks."""
        if self._workers_started:
            return
        
        self._workers_started = True
        for i in range(self.max_workers):
            asyncio.create_task(self._worker(f"worker-{i}"))
        
        logger.info(f"Started {self.max_workers} queue workers")
    
    async def _worker(self, worker_id: str):
        """Background worker that processes jobs from the queue."""
        logger.info(f"{worker_id} started")
        
        while not self._shutdown:
            try:
                # Wait for a job with timeout
                try:
                    job = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                logger.info(f"{worker_id} processing job {job.id}")
                
                job.status = JobStatus.PROCESSING
                job.started_at = datetime.utcnow()
                
                try:
                    # Process the job based on task type
                    if job.task_type == "chat":
                        await self._process_chat_job(job)
                    else:
                        raise ValueError(f"Unknown task type: {job.task_type}")
                    
                    job.status = JobStatus.COMPLETED
                    
                except Exception as e:
                    logger.error(f"{worker_id} job {job.id} failed: {e}")
                    job.status = JobStatus.FAILED
                    job.error = str(e)
                    
                    # Send error to result queue
                    if job.id in self._result_queues:
                        await self._result_queues[job.id].put({
                            'type': 'error',
                            'error': str(e)
                        })
                
                finally:
                    job.completed_at = datetime.utcnow()
                    self._queue.task_done()
                    
                    # Signal completion
                    if job.id in self._result_queues:
                        await self._result_queues[job.id].put(None)  # Signal end
            
            except Exception as e:
                logger.error(f"{worker_id} unexpected error: {e}")
    
    async def _process_chat_job(self, job: Job):
        """Process a chat generation job."""
        from app.services.ai_service import get_ai_service
        from app.models import ChatMessage
        
        ai_service = get_ai_service()
        
        message = job.payload.get('message', '')
        history_data = job.payload.get('history', [])
        
        # Convert history dict to ChatMessage objects
        history = [ChatMessage(**msg) if isinstance(msg, dict) else msg for msg in history_data]
        
        # Get result queue for this job
        result_queue = self._result_queues.get(job.id)
        
        # Stream results to the queue
        async for chunk in ai_service.generate_streaming_response(message, history):
            if result_queue:
                await result_queue.put(chunk)
    
    async def enqueue(
        self, 
        task_type: str, 
        payload: Dict[str, Any]
    ) -> Job:
        """
        Add a job to the queue.
        
        Args:
            task_type: Type of task (e.g., 'chat')
            payload: Task payload data
            
        Returns:
            The created Job object
        """
        job_id = str(uuid.uuid4())
        job = Job(
            id=job_id,
            task_type=task_type,
            payload=payload
        )
        
        self._jobs[job_id] = job
        self._result_queues[job_id] = asyncio.Queue()
        
        await self._queue.put(job)
        
        logger.info(f"Enqueued job {job_id} of type {task_type}")
        
        return job
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get a job by ID."""
        return self._jobs.get(job_id)
    
    async def get_result_stream(self, job_id: str):
        """
        Get an async generator that yields job results as they become available.
        
        This is used for SSE streaming of job results.
        """
        if job_id not in self._result_queues:
            yield f"data: {{'error': 'Job not found'}}\n\n"
            return
        
        result_queue = self._result_queues[job_id]
        
        while True:
            result = await result_queue.get()
            
            if result is None:  # End signal
                break
            
            yield result
        
        # Cleanup
        del self._result_queues[job_id]
    
    async def shutdown(self):
        """Gracefully shutdown the queue service."""
        self._shutdown = True
        
        # Wait for queue to be processed
        await self._queue.join()
        
        logger.info("Queue service shut down")


# Global queue service instance
queue_service: Optional[QueueService] = None


def get_queue_service() -> QueueService:
    """Get the global queue service instance."""
    global queue_service
    if queue_service is None:
        queue_service = QueueService()
    return queue_service


async def init_queue_service(max_workers: int = 3) -> QueueService:
    """Initialize and start the global queue service."""
    global queue_service
    queue_service = QueueService(max_workers=max_workers)
    await queue_service.start_workers()
    return queue_service
