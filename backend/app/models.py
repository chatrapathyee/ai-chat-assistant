"""
Pydantic models for request/response validation.
Defines all data structures used in the API.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field
import uuid


# ============ Enums ============

class MessageRole(str, Enum):
    """Role of a message in the conversation."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ToolCallType(str, Enum):
    """Types of tool calls that can be displayed."""
    THINKING = "thinking"
    SEARCHING_DOCUMENTS = "searching_documents"
    RETRIEVING_PDF = "retrieving_pdf"
    ANALYZING_CONTENT = "analyzing_content"
    GENERATING_RESPONSE = "generating_response"


class StreamEventType(str, Enum):
    """Types of events that can be streamed."""
    TEXT = "text"
    TOOL_CALL = "tool_call"
    CITATION = "citation"
    UI_COMPONENT = "ui_component"
    ERROR = "error"
    DONE = "done"


class UIComponentType(str, Enum):
    """Types of UI components that can be rendered."""
    INFO_CARD = "info_card"
    DATA_TABLE = "data_table"
    CHART = "chart"
    SOURCE_CARD = "source_card"


# ============ Request Models ============

class ChatMessage(BaseModel):
    """A single message in the chat conversation."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    citations: List["Citation"] = Field(default_factory=list)
    ui_components: List["UIComponent"] = Field(default_factory=list)
    tool_calls: List["ToolCall"] = Field(default_factory=list)


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[str] = None
    history: List[ChatMessage] = Field(default_factory=list)


class PDFUploadResponse(BaseModel):
    """Response after PDF upload."""
    pdf_id: str
    filename: str
    page_count: int
    status: str = "processed"


# ============ Citation Models ============

class Citation(BaseModel):
    """A citation reference in the AI response."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: int  # The citation number [1], [2], etc.
    pdf_id: str
    page_number: int
    text_snippet: str
    highlight_start: int  # Character position in PDF page
    highlight_end: int
    confidence: float = Field(ge=0.0, le=1.0, default=0.9)


class SourceCard(BaseModel):
    """Metadata card for cited documents."""
    pdf_id: str
    filename: str
    title: str
    page_count: int
    relevant_pages: List[int]
    snippet: str


# ============ Tool Call Models ============

class ToolCall(BaseModel):
    """Represents a tool call/reasoning step."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: ToolCallType
    status: str = "in_progress"  # in_progress, completed, error
    message: str
    duration_ms: Optional[int] = None


# ============ UI Component Models ============

class InfoCardData(BaseModel):
    """Data for an info card component."""
    title: str
    content: str
    icon: Optional[str] = None


class DataTableData(BaseModel):
    """Data for a data table component."""
    headers: List[str]
    rows: List[List[str]]
    caption: Optional[str] = None


class ChartData(BaseModel):
    """Data for a chart component."""
    chart_type: str  # bar, line, pie
    title: str
    labels: List[str]
    datasets: List[Dict[str, Any]]


class UIComponent(BaseModel):
    """A UI component to be rendered in the response."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: UIComponentType
    data: Union[InfoCardData, DataTableData, ChartData, SourceCard]


# ============ Stream Event Models ============

class StreamEvent(BaseModel):
    """An event in the SSE stream."""
    type: StreamEventType
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TextChunk(BaseModel):
    """A chunk of streamed text."""
    content: str
    is_complete: bool = False


# ============ PDF Models ============

class PDFMetadata(BaseModel):
    """Metadata for a stored PDF."""
    pdf_id: str
    filename: str
    title: str
    page_count: int
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    file_size: int
    text_content: Dict[int, str] = Field(default_factory=dict)  # page_num -> text


class PDFPageContent(BaseModel):
    """Content of a specific PDF page."""
    pdf_id: str
    page_number: int
    text: str
    word_positions: List[Dict[str, Any]] = Field(default_factory=list)


class PDFHighlight(BaseModel):
    """Highlight information for PDF viewer."""
    page_number: int
    text: str
    bounding_box: Optional[Dict[str, float]] = None


# ============ Response Models ============

class ChatResponse(BaseModel):
    """Response from chat endpoint (non-streaming)."""
    message_id: str
    content: str
    citations: List[Citation] = Field(default_factory=list)
    source_cards: List[SourceCard] = Field(default_factory=list)
    ui_components: List[UIComponent] = Field(default_factory=list)


class JobResponse(BaseModel):
    """Response when a job is queued."""
    job_id: str
    status: str = "queued"
    stream_url: str


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
    code: str = "UNKNOWN_ERROR"


# Update forward references
ChatMessage.model_rebuild()
