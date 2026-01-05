'use client';

import React, { useEffect } from 'react';
import { SplitLayout } from '@/components/layout';
import { clearAllPDFsOnBackend } from '@/lib/api';
import { usePDFListStore, useChatStore, usePDFViewerStore } from '@/store';

export default function Home() {
  const clearPDFs = usePDFListStore((state) => state.clearPDFs);
  const clearMessages = useChatStore((state) => state.clearMessages);
  const closePDF = usePDFViewerStore((state) => state.closePDF);

  // Clear all state on page load/reload for fresh start
  useEffect(() => {
    // Clear frontend state
    clearPDFs();
    clearMessages();
    closePDF();

    // Note: Backend PDFs are preserved and loaded on startup
  }, [clearPDFs, clearMessages, closePDF]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-neutral-900">
      <main className="flex-1 overflow-hidden">
        <SplitLayout />
      </main>
    </div>
  );
}
