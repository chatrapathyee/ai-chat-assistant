"""AI Service using Groq API.
Handles AI response generation with streaming support.
"""

import asyncio
import json
import re
from typing import AsyncGenerator, Dict, List, Optional, Any
from groq import Groq

from app.config import get_settings
from app.models import (
    ChatMessage, 
    Citation, 
    SourceCard,
    ToolCall, 
    ToolCallType,
    UIComponent,
    UIComponentType,
    InfoCardData,
    DataTableData,
    StreamEvent,
    StreamEventType,
)
from app.services.pdf_service import get_pdf_service, PDFService


class AIService:
    """Service for AI-powered chat responses using Groq."""
    
    def __init__(self):
        settings = get_settings()
        
        # Initialize the Groq client
        self.client = Groq(api_key=settings.groq_api_key)
        
        # Use llama-3.3-70b-versatile for best quality
        self.model_name = "llama-3.3-70b-versatile"
        
        self._citation_counter = 0
    
    def _build_context_prompt(self, pdf_contexts: List[Dict[str, Any]]) -> str:
        """Build context prompt from PDF contents."""
        if not pdf_contexts:
            return ""
        
        context_parts = ["Here are relevant document excerpts to reference in your answer:\n"]
        
        for i, ctx in enumerate(pdf_contexts, 1):
            context_parts.append(f"""
Document [{i}]: {ctx['title']}
Source: {ctx['filename']} (Page {ctx['page']})
Content:
{ctx['text'][:2000]}
---
""")
        
        context_parts.append("""
Instructions:
1. Use the document content above to answer the question
2. Include inline citations like [1], [2] when referencing documents
3. Be accurate and cite specific sections
4. If the documents don't contain relevant information, say so
""")
        
        return "\n".join(context_parts)
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract search keywords from text."""
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'how', 'why', 'when', 'where', 'who'}
        words = re.findall(r'\b\w+\b', text.lower())
        keywords = [w for w in words if w not in stop_words and len(w) > 2]
        return keywords[:10]
    
    async def _search_documents(
        self, 
        query: str, 
        pdf_service: PDFService
    ) -> List[Dict[str, Any]]:
        """Search all PDFs for relevant content."""
        results = []
        keywords = self._extract_keywords(query)
        
        for pdf in pdf_service.get_all_pdfs():
            relevant_pages = pdf_service.get_relevant_pages(pdf.pdf_id, keywords, max_pages=2)
            
            for page_num in relevant_pages:
                page_content = pdf_service.get_page_content(pdf.pdf_id, page_num)
                if page_content:
                    results.append({
                        'pdf_id': pdf.pdf_id,
                        'filename': pdf.filename,
                        'title': pdf.title,
                        'page': page_num,
                        'text': page_content.text
                    })
        
        return results[:5]
    
    async def generate_streaming_response(
        self,
        message: str,
        history: List[ChatMessage]
    ) -> AsyncGenerator[str, None]:
        """
        Generate AI response with streaming and tool calls.
        
        Yields SSE-formatted events for:
        - Tool calls (searching, analyzing, etc.)
        - Text chunks
        - Citations
        - UI components
        """
        try:
            pdf_service = get_pdf_service()
        except RuntimeError:
            pdf_service = None
        
        self._citation_counter = 0
        pdf_contexts: List[Dict[str, Any]] = []
        citations: List[Citation] = []
        
        # ===== TOOL CALL: Thinking =====
        yield self._format_sse(StreamEventType.TOOL_CALL, {
            'type': ToolCallType.THINKING.value,
            'status': 'in_progress',
            'message': 'Analyzing your question...'
        })
        await asyncio.sleep(0.5)
        
        yield self._format_sse(StreamEventType.TOOL_CALL, {
            'type': ToolCallType.THINKING.value,
            'status': 'completed',
            'message': 'Question analyzed'
        })
        
        # ===== TOOL CALL: Search Documents =====
        if pdf_service and pdf_service.get_all_pdfs():
            yield self._format_sse(StreamEventType.TOOL_CALL, {
                'type': ToolCallType.SEARCHING_DOCUMENTS.value,
                'status': 'in_progress',
                'message': 'Searching documents for relevant information...'
            })
            await asyncio.sleep(0.8)
            
            pdf_contexts = await self._search_documents(message, pdf_service)
            
            yield self._format_sse(StreamEventType.TOOL_CALL, {
                'type': ToolCallType.SEARCHING_DOCUMENTS.value,
                'status': 'completed',
                'message': f'Found {len(pdf_contexts)} relevant sections'
            })
            
            # ===== TOOL CALL: Retrieve PDF Content =====
            if pdf_contexts:
                yield self._format_sse(StreamEventType.TOOL_CALL, {
                    'type': ToolCallType.RETRIEVING_PDF.value,
                    'status': 'in_progress',
                    'message': 'Extracting content from sources...'
                })
                await asyncio.sleep(0.5)
                
                yield self._format_sse(StreamEventType.TOOL_CALL, {
                    'type': ToolCallType.RETRIEVING_PDF.value,
                    'status': 'completed',
                    'message': 'Content extracted'
                })
                
                for i, ctx in enumerate(pdf_contexts, 1):
                    citation = Citation(
                        number=i,
                        pdf_id=ctx['pdf_id'],
                        page_number=ctx['page'],
                        text_snippet=ctx['text'][:200] + '...',
                        highlight_start=0,
                        highlight_end=min(200, len(ctx['text']))
                    )
                    citations.append(citation)
        
        # ===== TOOL CALL: Generate Response =====
        yield self._format_sse(StreamEventType.TOOL_CALL, {
            'type': ToolCallType.GENERATING_RESPONSE.value,
            'status': 'in_progress',
            'message': 'Generating response...'
        })
        
        context_prompt = self._build_context_prompt(pdf_contexts)
        
        history_text = ""
        for msg in history[-5:]:
            role = "User" if msg.role.value == "user" else "Assistant"
            history_text += f"{role}: {msg.content}\n"
        
        full_prompt = f"""{context_prompt}

Previous conversation:
{history_text}

User's question: {message}

Please provide a helpful, accurate response. If you reference any documents, use inline citations like [1], [2], etc."""

        # ===== Stream AI Response =====
        try:
            # Use Groq streaming API
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant. When referencing documents, use inline citations like [1], [2], etc."},
                    {"role": "user", "content": full_prompt}
                ],
                temperature=0.7,
                max_tokens=4096,
                stream=True
            )
            
            full_response = ""
            
            for chunk in response:
                if chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    full_response += text
                    yield self._format_sse(StreamEventType.TEXT, {
                        'content': text,
                        'is_complete': False
                    })
                    await asyncio.sleep(0.02)
            
            yield self._format_sse(StreamEventType.TEXT, {
                'content': '',
                'is_complete': True
            })
            
        except Exception as e:
            yield self._format_sse(StreamEventType.ERROR, {
                'error': str(e),
                'message': 'Failed to generate response'
            })
            return
        
        # ===== Send Citations =====
        for citation in citations:
            yield self._format_sse(StreamEventType.CITATION, citation.model_dump())
        
        # ===== Send Source Cards =====
        seen_pdfs = set()
        for ctx in pdf_contexts:
            if ctx['pdf_id'] not in seen_pdfs:
                seen_pdfs.add(ctx['pdf_id'])
                
                pdf_pages = [c['page'] for c in pdf_contexts if c['pdf_id'] == ctx['pdf_id']]
                
                source_card = SourceCard(
                    pdf_id=ctx['pdf_id'],
                    filename=ctx['filename'],
                    title=ctx['title'],
                    page_count=pdf_service.get_metadata(ctx['pdf_id']).page_count if pdf_service else 1,
                    relevant_pages=pdf_pages,
                    snippet=ctx['text'][:150] + '...'
                )
                
                ui_component = UIComponent(
                    type=UIComponentType.SOURCE_CARD,
                    data=source_card
                )
                
                yield self._format_sse(StreamEventType.UI_COMPONENT, ui_component.model_dump())
        
        # ===== Generate Additional UI Components =====
        if any(keyword in message.lower() for keyword in ['compare', 'list', 'summary', 'overview']):
            info_card = UIComponent(
                type=UIComponentType.INFO_CARD,
                data=InfoCardData(
                    title="Quick Summary",
                    content="This response synthesizes information from multiple sources.",
                    icon="📊"
                )
            )
            yield self._format_sse(StreamEventType.UI_COMPONENT, info_card.model_dump())
        
        yield self._format_sse(StreamEventType.TOOL_CALL, {
            'type': ToolCallType.GENERATING_RESPONSE.value,
            'status': 'completed',
            'message': 'Response complete'
        })
        
        # ===== Done Event =====
        yield self._format_sse(StreamEventType.DONE, {
            'message': 'Stream complete',
            'citation_count': len(citations)
        })
    
    def _format_sse(self, event_type: StreamEventType, data: Dict[str, Any]) -> str:
        """Format data as Server-Sent Event."""
        event = StreamEvent(type=event_type, data=data)
        return f"data: {json.dumps(event.model_dump(), default=str)}\n\n"


# Global AI service instance
ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    """Get the global AI service instance."""
    global ai_service
    if ai_service is None:
        ai_service = AIService()
    return ai_service
