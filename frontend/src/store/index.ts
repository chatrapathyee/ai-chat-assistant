/**
 * Zustand store for global state management.
 * Manages chat history, PDF viewer state, and theme.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ChatMessage,
  ToolCall,
  Citation,
  UIComponent,
  PDFViewerState,
  MessageRole,
} from '@/types';

// ============ Chat Store ============

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  currentToolCalls: ToolCall[];
  error: string | null;
  conversationId: string | null;

  // Actions
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (update: Partial<ChatMessage>) => void;
  appendToLastMessage: (content: string) => void;
  addToolCall: (toolCall: ToolCall) => void;
  updateToolCall: (id: string, update: Partial<ToolCall>) => void;
  clearToolCalls: () => void;
  addCitationToLastMessage: (citation: Citation) => void;
  addUIComponentToLastMessage: (component: UIComponent) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  setConversationId: (id: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  currentToolCalls: [],
  error: null,
  conversationId: null,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateLastMessage: (update) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          ...update,
        };
      }
      return { messages };
    }),

  appendToLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content: messages[messages.length - 1].content + content,
        };
      }
      return { messages };
    }),

  addToolCall: (toolCall) =>
    set((state) => ({
      currentToolCalls: [...state.currentToolCalls, toolCall],
    })),

  updateToolCall: (id, update) =>
    set((state) => ({
      currentToolCalls: state.currentToolCalls.map((tc) =>
        tc.id === id ? { ...tc, ...update } : tc
      ),
    })),

  clearToolCalls: () => set({ currentToolCalls: [] }),

  addCitationToLastMessage: (citation) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        messages[messages.length - 1] = {
          ...lastMessage,
          citations: [...lastMessage.citations, citation],
        };
      }
      return { messages };
    }),

  addUIComponentToLastMessage: (component) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        messages[messages.length - 1] = {
          ...lastMessage,
          ui_components: [...lastMessage.ui_components, component],
        };
      }
      return { messages };
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearMessages: () =>
    set({
      messages: [],
      currentToolCalls: [],
      error: null,
      conversationId: null,
    }),

  setConversationId: (id) => set({ conversationId: id }),
}));

// ============ PDF Viewer Store ============

interface PDFViewerStore extends PDFViewerState {
  // Actions
  openPDF: (pdfId: string, pageNumber?: number, highlightText?: string) => void;
  closePDF: () => void;
  setPage: (pageNumber: number) => void;
  setScale: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

export const usePDFViewerStore = create<PDFViewerStore>((set) => ({
  isOpen: false,
  pdfId: null,
  pageNumber: 1,
  highlightText: null,
  scale: 1.0,

  openPDF: (pdfId, pageNumber = 1, highlightText = undefined) =>
    set({
      isOpen: true,
      pdfId,
      pageNumber,
      highlightText,
    }),

  closePDF: () =>
    set({
      isOpen: false,
      pdfId: null,
      pageNumber: 1,
      highlightText: undefined,
    }),

  setPage: (pageNumber) => set({ pageNumber }),

  setScale: (scale) => set({ scale }),

  zoomIn: () =>
    set((state) => ({
      scale: Math.min(state.scale + 0.25, 3),
    })),

  zoomOut: () =>
    set((state) => ({
      scale: Math.max(state.scale - 0.25, 0.5),
    })),

  resetZoom: () => set({ scale: 1.0 }),
}));

// ============ Theme Store ============

interface ThemeStore {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

// ============ PDF List Store ============

interface PDFListStore {
  pdfs: Array<{
    pdf_id: string;
    filename: string;
    title: string;
    page_count: number;
  }>;
  isLoading: boolean;
  setPDFs: (pdfs: PDFListStore['pdfs']) => void;
  addPDF: (pdf: PDFListStore['pdfs'][0]) => void;
  removePDF: (pdfId: string) => void;
  clearPDFs: () => void;
  setLoading: (loading: boolean) => void;
}

export const usePDFListStore = create<PDFListStore>((set) => ({
  pdfs: [],
  isLoading: false,

  setPDFs: (pdfs) => set({ pdfs }),

  addPDF: (pdf) =>
    set((state) => ({
      pdfs: [...state.pdfs, pdf],
    })),

  removePDF: (pdfId) =>
    set((state) => ({
      pdfs: state.pdfs.filter((pdf) => pdf.pdf_id !== pdfId),
    })),

  clearPDFs: () => set({ pdfs: [] }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
