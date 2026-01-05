/**
 * TypeScript type definitions for the AI Chat Assistant.
 * Matches the backend Pydantic models.
 */

// ============ Enums ============

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum ToolCallType {
  THINKING = 'thinking',
  SEARCHING_DOCUMENTS = 'searching_documents',
  RETRIEVING_PDF = 'retrieving_pdf',
  ANALYZING_CONTENT = 'analyzing_content',
  GENERATING_RESPONSE = 'generating_response',
}

export enum StreamEventType {
  TEXT = 'text',
  TOOL_CALL = 'tool_call',
  CITATION = 'citation',
  UI_COMPONENT = 'ui_component',
  ERROR = 'error',
  DONE = 'done',
}

export enum UIComponentType {
  INFO_CARD = 'info_card',
  DATA_TABLE = 'data_table',
  CHART = 'chart',
  SOURCE_CARD = 'source_card',
}

// ============ Base Types ============

export interface Citation {
  id: string;
  number: number;
  pdf_id: string;
  page_number: number;
  text_snippet: string;
  highlight_start: number;
  highlight_end: number;
  confidence: number;
}

export interface ToolCall {
  id: string;
  type: ToolCallType;
  status: 'in_progress' | 'completed' | 'error';
  message: string;
  duration_ms?: number;
}

export interface SourceCard {
  pdf_id: string;
  filename: string;
  title: string;
  page_count: number;
  relevant_pages: number[];
  snippet: string;
}

export interface InfoCardData {
  title: string;
  content: string;
  icon?: string;
}

export interface DataTableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface ChartData {
  chart_type: 'bar' | 'line' | 'pie';
  title: string;
  labels: string[];
  datasets: Record<string, unknown>[];
}

export type UIComponentData = InfoCardData | DataTableData | ChartData | SourceCard;

export interface UIComponent {
  id: string;
  type: UIComponentType;
  data: UIComponentData;
}

// ============ Message Types ============

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  citations: Citation[];
  ui_components: UIComponent[];
  tool_calls: ToolCall[];
  isStreaming?: boolean;
}

// ============ Request/Response Types ============

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  history: ChatMessage[];
}

export interface JobResponse {
  job_id: string;
  status: string;
  stream_url: string;
}

export interface PDFMetadata {
  pdf_id: string;
  filename: string;
  title: string;
  page_count: number;
  upload_date: string;
  file_size: number;
}

export interface PDFUploadResponse {
  pdf_id: string;
  filename: string;
  page_count: number;
  status: string;
}

export interface PDFSearchResult {
  page_number: number;
  snippet: string;
  start_position: number;
  end_position: number;
}

// ============ Stream Event Types ============

export interface StreamEvent {
  type: StreamEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface TextChunkData {
  content: string;
  is_complete: boolean;
}

export interface ToolCallData {
  type: ToolCallType;
  status: 'in_progress' | 'completed' | 'error';
  message: string;
}

export interface ErrorData {
  error: string;
  message: string;
}

export interface DoneData {
  message: string;
  citation_count: number;
}

// ============ Store Types ============

export interface PDFViewerState {
  isOpen: boolean;
  pdfId: string | null;
  pageNumber: number;
  highlightText: string | null;
  scale: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentToolCalls: ToolCall[];
  error: string | null;
}

export interface AppState {
  chat: ChatState;
  pdfViewer: PDFViewerState;
  theme: 'light' | 'dark';
}
