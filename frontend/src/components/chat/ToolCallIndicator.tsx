/**
 * Perplexity-style tool call indicator.
 * Shows reasoning steps with clean, minimal design using icons.
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getToolCallLabel } from '@/lib/utils';
import type { ToolCall } from '@/types';
import { ToolCallType } from '@/types';

// Icon components for each tool call type
const ToolIcons: Record<string, React.ReactNode> = {
  [ToolCallType.THINKING]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  [ToolCallType.SEARCHING_DOCUMENTS]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  [ToolCallType.RETRIEVING_PDF]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  [ToolCallType.ANALYZING_CONTENT]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
    </svg>
  ),
  [ToolCallType.GENERATING_RESPONSE]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  ),
};

interface ToolCallIndicatorProps {
  toolCalls: ToolCall[];
  className?: string;
}

export function ToolCallIndicator({ toolCalls, className }: ToolCallIndicatorProps) {
  if (toolCalls.length === 0) {
    return null;
  }

  // Only show the most recent active or last completed tool call
  const activeToolCall = toolCalls.find(tc => tc.status === 'in_progress') || toolCalls[toolCalls.length - 1];
  const icon = ToolIcons[activeToolCall.type] || ToolIcons[ToolCallType.THINKING];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Thinking indicator */}
      <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
        {activeToolCall.status === 'in_progress' ? (
          <>
            <div className="relative flex items-center justify-center w-6 h-6">
              <div className="absolute inset-0 w-6 h-6 rounded-full border-2 border-blue-500/30" />
              <div className="absolute inset-0 w-6 h-6 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
              <span className="text-blue-500">{icon}</span>
            </div>
            <span className="text-sm font-medium">{getToolCallLabel(activeToolCall.type)}</span>
            <div className="flex gap-0.5 ml-1">
              <span className="w-1 h-1 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm">{activeToolCall.message || 'Done'}</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Single tool call item for inline display.
 */
interface ToolCallItemProps {
  type: string;
  status: string;
  message?: string;
}

export function ToolCallItem({ type, status, message }: ToolCallItemProps) {
  const icon = ToolIcons[type as ToolCallType] || ToolIcons[ToolCallType.THINKING];
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs',
        'bg-neutral-100 dark:bg-neutral-800',
        status === 'completed' && 'text-emerald-600 dark:text-emerald-400',
        status === 'error' && 'text-red-600 dark:text-red-400'
      )}
    >
      {status === 'in_progress' && (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-300 border-t-blue-500 animate-spin" />
      )}
      {status === 'completed' && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {status === 'error' && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className="font-medium">{getToolCallLabel(type)}</span>
    </div>
  );
}
