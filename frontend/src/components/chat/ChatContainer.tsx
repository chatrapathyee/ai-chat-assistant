/**
 * Perplexity-style chat container component.
 * Clean, centered layout with modern aesthetics.
 */

'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, generateId } from '@/lib/utils';
import { useChatStore, usePDFViewerStore, useThemeStore, usePDFListStore } from '@/store';
import { streamChatMessageDirect } from '@/lib/api';
import { ChatMessage, WelcomeScreen } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ChatInputHandle } from './ChatInput';
import { ToolCallIndicator } from './ToolCallIndicator';
import { MessageRole, ToolCallType } from '@/types';

interface ChatContainerProps {
  className?: string;
}

export function ChatContainer({ className }: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const secondInputRef = useRef<ChatInputHandle>(null);

  const {
    messages,
    isLoading,
    currentToolCalls,
    error,
    addMessage,
    updateLastMessage,
    appendToLastMessage,
    addToolCall,
    updateToolCall,
    clearToolCalls,
    addCitationToLastMessage,
    addUIComponentToLastMessage,
    setLoading,
    setError,
    clearMessages,
  } = useChatStore();

  const clearPDFs = usePDFListStore((state) => state.clearPDFs);
  const isPDFOpen = usePDFViewerStore((state) => state.isOpen);
  const { theme, toggleTheme } = useThemeStore();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentToolCalls]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus input with "/" key (when not already in an input)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        if (messages.length > 0) {
          secondInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }

      // Focus input with Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (messages.length > 0) {
          secondInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }

      // New chat with Ctrl+Shift+N / Cmd+Shift+N
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        handleNewChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messages.length]);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    clearMessages();
    clearPDFs();
  }, [clearMessages, clearPDFs]);

  // Handle sending a message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Add user message
      const userMessage = {
        id: generateId(),
        role: MessageRole.USER,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        citations: [],
        ui_components: [],
        tool_calls: [],
      };
      addMessage(userMessage);

      // Prepare assistant message placeholder
      const assistantMessage = {
        id: generateId(),
        role: MessageRole.ASSISTANT,
        content: '',
        timestamp: new Date().toISOString(),
        citations: [],
        ui_components: [],
        tool_calls: [],
        isStreaming: true,
      };
      addMessage(assistantMessage);

      setLoading(true);
      setError(null);
      clearToolCalls();

      try {
        // Stream the response
        await streamChatMessageDirect(
          {
            message: content,
            history: messages.slice(-10),
          },
          {
            onText: (text, isComplete) => {
              if (text) {
                appendToLastMessage(text);
              }
              if (isComplete) {
                updateLastMessage({ isStreaming: false });
              }
            },
            onToolCall: (type, status, message) => {
              const toolCallId = `${type}-${Date.now()}`;
              const existingToolCall = currentToolCalls.find(
                (tc) => tc.type === type
              );
              
              if (existingToolCall) {
                updateToolCall(existingToolCall.id, { status, message });
              } else {
                addToolCall({
                  id: toolCallId,
                  type: type as ToolCallType,
                  status,
                  message,
                });
              }
            },
            onCitation: (citation) => {
              addCitationToLastMessage(citation);
            },
            onUIComponent: (component) => {
              addUIComponentToLastMessage(component);
            },
            onError: (errorMsg) => {
              setError(errorMsg);
              updateLastMessage({
                isStreaming: false,
                content: `Error: ${errorMsg}`,
              });
            },
            onDone: () => {
              updateLastMessage({ isStreaming: false });
              clearToolCalls();
            },
          }
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        updateLastMessage({
          isStreaming: false,
          content: `Error: ${errorMessage}`,
        });
      } finally {
        setLoading(false);
      }
    },
    [
      isLoading,
      messages,
      addMessage,
      updateLastMessage,
      appendToLastMessage,
      addToolCall,
      updateToolCall,
      clearToolCalls,
      addCitationToLastMessage,
      addUIComponentToLastMessage,
      setLoading,
      setError,
      currentToolCalls,
    ]
  );

  const hasMessages = messages.length > 0;

  return (
    <div
      className={cn(
        'flex flex-col h-full',
        'bg-white dark:bg-neutral-900',
        className
      )}
    >
      {/* Header - minimal Perplexity style */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <img
            src="https://www.calquity.com/calquity-logo-full.png"
            alt="CalQuity"
            className="h-7 w-auto object-contain"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* New Chat */}
          <button
            onClick={handleNewChat}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="New thread (Ctrl+Shift+N)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Messages area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {!hasMessages ? (
          <div className="flex flex-col h-full">
            {/* Centered welcome content */}
            <div className="flex-1 flex items-center justify-center">
              <WelcomeScreen onSuggestionClick={handleSendMessage} />
            </div>
            {/* Input at bottom for welcome screen */}
            <div className="px-4 pb-8 pt-4">
              <div className="max-w-4xl mx-auto">
                <ChatInput
                  ref={inputRef}
                  onSend={handleSendMessage}
                  disabled={isLoading}
                  placeholder={isLoading ? 'Thinking...' : 'Ask anything...'}
                  compact={false}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-4 py-6">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1}
                />
              ))}
            </AnimatePresence>

            {/* Tool call indicators */}
            {currentToolCalls.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <ToolCallIndicator toolCalls={currentToolCalls} />
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area - only show when there are messages */}
      {hasMessages && (
        <div className={cn(
          'border-t border-neutral-200 dark:border-neutral-800',
          'bg-white dark:bg-neutral-900',
          'px-4 py-4'
        )}>
          <div className="max-w-5xl mx-auto">
            <ChatInput
              ref={secondInputRef}
              onSend={handleSendMessage}
              disabled={isLoading}
              placeholder={isLoading ? 'Thinking...' : 'Ask a follow-up...'}
              compact={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
