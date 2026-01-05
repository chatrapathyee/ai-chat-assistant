/**
 * Typing indicator component with animated dots.
 * Shown when waiting for AI response.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="text-gray-500 dark:text-gray-400 text-sm mr-2">AI is typing</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'w-2 h-2 bg-primary-500 rounded-full animate-pulse-dot',
            )}
            style={{
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
