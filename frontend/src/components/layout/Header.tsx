/**
 * Header component with theme toggle and CalQuity branding.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useThemeStore, usePDFListStore, useChatStore } from '@/store';

export function Header() {
  const { theme, toggleTheme } = useThemeStore();
  const pdfs = usePDFListStore((state) => state.pdfs);
  const clearPDFs = usePDFListStore((state) => state.clearPDFs);
  const clearMessages = useChatStore((state) => state.clearMessages);

  const handleNewChat = () => {
    clearMessages();
    clearPDFs();
  };

  return (
    <header
      className={cn(
        'h-14 px-4 flex items-center justify-between',
        'bg-white dark:bg-neutral-900',
        'border-b border-neutral-200 dark:border-neutral-800'
      )}
    >
      {/* CalQuity Logo */}
      <div className="flex items-center gap-3">
        <img
          src="https://www.calquity.com/calquity-logo-full.png"
          alt="CalQuity"
          className="h-8 w-auto object-contain"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* PDF count badge */}
        {pdfs.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg mr-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span>{pdfs.length} PDF{pdfs.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* New chat button */}
        <motion.button
          onClick={handleNewChat}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
            'text-neutral-600 dark:text-neutral-300',
            'hover:bg-neutral-100 dark:hover:bg-neutral-800',
            'border border-neutral-200 dark:border-neutral-700',
            'transition-colors text-sm font-medium'
          )}
          title="Start new chat (Ctrl+Shift+N)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="hidden sm:inline">New Chat</span>
        </motion.button>

        {/* Theme toggle */}
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'p-2 rounded-lg',
            'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
            'hover:bg-neutral-100 dark:hover:bg-neutral-800',
            'transition-colors'
          )}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
              />
            </svg>
          )}
        </motion.button>
      </div>
    </header>
  );
}
