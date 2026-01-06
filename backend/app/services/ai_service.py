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
    
    async def _search_documents(self, query: str, pdf_service: PDFService, pdf_ids: List[str] = None) -> List[Dict[str, Any]]:
        """Search specified PDFs for relevant content."""
        results = []
        query_lower = query.lower()

        # Get PDFs to search - either specified ones or all if none specified
        pdfs_to_search = []
        if pdf_ids:
            # If specific PDFs are requested, include content from all their pages
            for pdf_id in pdf_ids:
                pdf = pdf_service.get_metadata(pdf_id)
                if pdf:
                    pdfs_to_search.append(pdf)
        else:
            pdfs_to_search = pdf_service.get_all_pdfs()

        for pdf in pdfs_to_search:
            # If specific PDFs were requested, include content from all pages
            # Otherwise, only include pages that match the query
            should_include_all_pages = pdf_ids is not None and pdf.pdf_id in pdf_ids

            for page_num in range(1, pdf.page_count + 1):
                page_content = pdf_service.get_page_content(pdf.pdf_id, page_num)
                if page_content:
                    if should_include_all_pages:
                        # Include all pages from requested PDFs
                        results.append({
                            'pdf_id': pdf.pdf_id,
                            'filename': pdf.filename,
                            'title': pdf.title,
                            'page': page_num,
                            'text': page_content.text[:1500]
                        })
                    else:
                        # Only include pages that match the query
                        text_lower = page_content.text.lower()
                        if query_lower in text_lower or any(word in text_lower for word in query_lower.split() if len(word) > 2):
                            results.append({
                                'pdf_id': pdf.pdf_id,
                                'filename': pdf.filename,
                                'title': pdf.title,
                                'page': page_num,
                                'text': page_content.text[:1500]
                            })

        # Sort by relevance (pages with more query matches first)
        if not pdf_ids:
            results.sort(key=lambda x: sum(1 for word in query_lower.split() if word in x['text'].lower()), reverse=True)

        return results[:10]  # Allow more results
    
    async def generate_streaming_response(
        self,
        message: str,
        history: List[ChatMessage],
        pdf_ids: List[str] = None
    ) -> AsyncGenerator[str, None]:
        """Generate AI response with streaming support."""
        pdf_contexts = []
        citations = []

        # Search PDFs if available
        try:
            pdf_service = get_pdf_service()
            if pdf_service.get_all_pdfs():
                pdf_contexts = await self._search_documents(message, pdf_service, pdf_ids)
                print(f"DEBUG: Found {len(pdf_contexts)} PDF contexts for query: {message}")

                # Create citations for found content
                for i, ctx in enumerate(pdf_contexts, 1):
                    citations.append(Citation(
                        number=i,
                        pdf_id=ctx['pdf_id'],
                        page_number=ctx['page'],
                        text_snippet=ctx['text'][:200] + '...',
                        highlight_start=0,
                        highlight_end=min(200, len(ctx['text']))
                    ))
        except RuntimeError:
            pass  # No PDF service available

        # Build prompt with context
        context = self._build_context_prompt(pdf_contexts)
        print(f"DEBUG: Context prompt:\n{context[:500]}...")

        history_text = "\n".join([
            f"{'User' if msg.role.value == 'user' else 'Assistant'}: {msg.content}"
            for msg in history[-3:]
        ])

        prompt = f"{context}\n\nPrevious conversation:\n{history_text}\n\nQuestion: {message}"
        print(f"DEBUG: Full prompt length: {len(prompt)}")

        try:
            # Stream response from Groq
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant. Use inline citations like [1], [2] when referencing documents."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2048,
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    yield self._format_sse(StreamEventType.TEXT, {
                        'content': chunk.choices[0].delta.content,
                        'is_complete': False
                    })

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

        # Send citations and source cards
        for citation in citations:
            yield self._format_sse(StreamEventType.CITATION, citation.model_dump())

        # Send source cards for unique PDFs
        seen_pdfs = set()
        for ctx in pdf_contexts:
            if ctx['pdf_id'] not in seen_pdfs:
                seen_pdfs.add(ctx['pdf_id'])
                pages = [c['page'] for c in pdf_contexts if c['pdf_id'] == ctx['pdf_id']]

                source_card = SourceCard(
                    pdf_id=ctx['pdf_id'],
                    filename=ctx['filename'],
                    title=ctx['title'],
                    page_count=pdf_service.get_metadata(ctx['pdf_id']).page_count,
                    relevant_pages=pages,
                    snippet=ctx['text'][:150] + '...'
                )

                ui_component = UIComponent(
                    type=UIComponentType.SOURCE_CARD,
                    data=source_card
                )
                yield self._format_sse(StreamEventType.UI_COMPONENT, ui_component.model_dump())

        yield self._format_sse(StreamEventType.DONE, {'message': 'Complete'})
    
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
