/**
 * Perplexity-style citation badge component.
 * Clean, minimal numbered badge that opens the PDF viewer.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePDFViewerStore } from '@/store';
import type { Citation } from '@/types';

interface CitationBadgeProps {
  number: number;
  citation?: Citation;
  className?: string;
}

export function CitationBadge({ number, citation, className }: CitationBadgeProps) {
  const openPDF = usePDFViewerStore((state) => state.openPDF);

  const handleClick = () => {
    if (citation) {
      openPDF(citation.pdf_id, citation.page_number, citation.text_snippet);
    }
  };

  return (
    <motion.button
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-[18px] h-[18px] px-1 text-[11px] font-medium',
        'bg-blue-100 dark:bg-blue-900/30',
        'text-blue-600 dark:text-blue-400',
        'rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/50',
        'cursor-pointer transition-colors',
        'mx-0.5 align-super',
        className
      )}
      title={citation ? `View source: Page ${citation.page_number}` : `Citation ${number}`}
    >
      {number}
    </motion.button>
  );
}

/**
 * Source card component - Perplexity style.
 * Shows document metadata below the response.
 */
interface SourceCardProps {
  pdfId: string;
  filename: string;
  title: string;
  pageCount: number;
  relevantPages: number[];
  snippet: string;
  onClick?: () => void;
}

export function SourceCard({
  pdfId,
  filename,
  title,
  pageCount,
  relevantPages,
  snippet,
  onClick,
}: SourceCardProps) {
  const openPDF = usePDFViewerStore((state) => state.openPDF);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      openPDF(pdfId, relevantPages[0] || 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleClick}
      className={cn(
        'p-3 rounded-xl border cursor-pointer',
        'bg-white dark:bg-neutral-800',
        'border-neutral-200 dark:border-neutral-700',
        'hover:border-blue-300 dark:hover:border-blue-700',
        'hover:shadow-md transition-all',
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-neutral-900 dark:text-white truncate">
            {title}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {filename}
          </p>
        </div>
      </div>

      {/* Snippet */}
      <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 mb-2">
        {snippet}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>{pageCount} pages</span>
        <span>
          Pages: {relevantPages.slice(0, 3).join(', ')}
          {relevantPages.length > 3 && '...'}
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Source cards grid component.
 */
interface SourceCardsGridProps {
  sources: Array<{
    pdf_id: string;
    filename: string;
    title: string;
    page_count: number;
    relevant_pages: number[];
    snippet: string;
  }>;
}

export function SourceCardsGrid({ sources }: SourceCardsGridProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Sources
      </h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sources.map((source) => (
          <SourceCard
            key={source.pdf_id}
            pdfId={source.pdf_id}
            filename={source.filename}
            title={source.title}
            pageCount={source.page_count}
            relevantPages={source.relevant_pages}
            snippet={source.snippet}
          />
        ))}
      </div>
    </div>
  );
}
