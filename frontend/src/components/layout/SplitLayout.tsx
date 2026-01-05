/**
 * Perplexity-style split layout component.
 * Clean transitions between chat and PDF viewer.
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePDFViewerStore } from '@/store';
import { ChatContainer } from '@/components/chat';
import { PDFViewer } from '@/components/pdf';

export function SplitLayout() {
  const isPDFOpen = usePDFViewerStore((state) => state.isOpen);

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-neutral-900">
      {/* Chat panel */}
      <motion.div
        layout
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={cn(
          'h-full transition-all duration-300 ease-out',
          isPDFOpen ? 'w-full lg:w-[55%]' : 'w-full'
        )}
      >
        <ChatContainer />
      </motion.div>

      {/* PDF viewer panel - desktop */}
      <AnimatePresence mode="wait">
        {isPDFOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '45%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'h-full hidden lg:block',
              'border-l border-neutral-200 dark:border-neutral-800',
              'bg-neutral-50 dark:bg-neutral-950'
            )}
          >
            <PDFViewer />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile PDF viewer overlay */}
      <AnimatePresence>
        {isPDFOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden bg-black/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute right-0 h-full w-full max-w-lg bg-white dark:bg-neutral-900 shadow-2xl"
            >
              <PDFViewer />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
