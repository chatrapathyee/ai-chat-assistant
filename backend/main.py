"""
FastAPI Main Application Entry Point.
Initializes the application with all routes and services.
"""

import asyncio
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import chat_router, pdf_router
from app.services import init_pdf_service, init_queue_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting AI Chat Assistant Backend...")
    
    settings = get_settings()
    
    # Initialize PDF service
    pdf_service = init_pdf_service(settings.pdf_storage_path)
    await pdf_service.load_existing_pdfs()
    logger.info(f"PDF service initialized with storage at: {settings.pdf_storage_path}")
    
    # Initialize queue service
    await init_queue_service(max_workers=3)
    logger.info("Queue service initialized with 3 workers")
    
    logger.info("Backend startup complete!")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Chat Assistant Backend...")
    from app.services import get_queue_service
    queue_service = get_queue_service()
    await queue_service.shutdown()
    logger.info("Backend shutdown complete!")


# Create FastAPI application
app = FastAPI(
    title="AI Chat Assistant API",
    description="Backend API for AI-powered chat with PDF citation support",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat_router, prefix="/api")
app.include_router(pdf_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "status": "healthy",
        "service": "AI Chat Assistant API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "services": {
            "api": "running",
            "pdf_service": "running",
            "queue_service": "running"
        }
    }


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
