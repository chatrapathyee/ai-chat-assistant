"""Routes package initialization."""

from app.routes.chat import router as chat_router
from app.routes.pdf import router as pdf_router

__all__ = ['chat_router', 'pdf_router']
