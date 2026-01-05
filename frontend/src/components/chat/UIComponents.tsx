/**
 * Perplexity-style UI Components for generative UI rendering.
 * Source cards, info cards, and data tables.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { UIComponentType } from '@/types';
import type {
  UIComponent,
  InfoCardData,
  DataTableData,
  SourceCard as SourceCardType,
} from '@/types';
import { usePDFViewerStore } from '@/store';

interface UIComponentRendererProps {
  component: UIComponent;
  className?: string;
}

export function UIComponentRenderer({ component, className }: UIComponentRendererProps) {
  switch (component.type) {
    case UIComponentType.INFO_CARD:
      return (
        <InfoCard
          data={component.data as InfoCardData}
          className={className}
        />
      );

    case UIComponentType.DATA_TABLE:
      return (
        <DataTable
          data={component.data as DataTableData}
          className={className}
        />
      );

    case UIComponentType.SOURCE_CARD:
      const sourceData = component.data as SourceCardType;
      return (
        <SourceCardComponent
          pdfId={sourceData.pdf_id}
          filename={sourceData.filename}
          title={sourceData.title}
          pageCount={sourceData.page_count}
          relevantPages={sourceData.relevant_pages}
          snippet={sourceData.snippet}
        />
      );

    default:
      return null;
  }
}

/**
 * Perplexity-style source card.
 */
interface SourceCardProps {
  pdfId: string;
  filename: string;
  title: string;
  pageCount: number;
  relevantPages: number[];
  snippet?: string;
}

function SourceCardComponent({ 
  pdfId, 
  filename, 
  title, 
  pageCount, 
  relevantPages,
  snippet 
}: SourceCardProps) {
  const { openPDF, setPage } = usePDFViewerStore();

  const handleClick = () => {
    openPDF(pdfId);
    if (relevantPages.length > 0) {
      setPage(relevantPages[0]);
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleClick}
      className={cn(
        'w-full text-left p-3 rounded-xl',
        'bg-white dark:bg-neutral-800',
        'border border-neutral-200 dark:border-neutral-700',
        'hover:border-blue-300 dark:hover:border-blue-700',
        'hover:shadow-md',
        'transition-all duration-200',
        'group'
      )}
    >
      <div className="flex items-start gap-3">
        {/* PDF icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13H10v5H8.5v-5zm3 0h1.5l.75 3.3.75-3.3h1.5l-1.5 5h-1.5l-1.5-5zm5.5 0h2.5v1.2h-2.5v1h2v1.2h-2v1.6H20V13z"/>
          </svg>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-neutral-900 dark:text-white text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title || filename}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {pageCount} pages • Page{relevantPages.length > 1 ? 's' : ''} {relevantPages.join(', ')}
          </p>
          {snippet && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1.5 line-clamp-2">
              {snippet}
            </p>
          )}
        </div>

        {/* Arrow indicator */}
        <svg className="w-4 h-4 text-neutral-400 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </motion.button>
  );
}

/**
 * Info card component - Perplexity style.
 */
interface InfoCardProps {
  data: InfoCardData;
  className?: string;
}

export function InfoCard({ data, className }: InfoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-xl',
        'bg-blue-50 dark:bg-blue-900/20',
        'border border-blue-100 dark:border-blue-800/50',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {data.icon && (
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
        )}
        <div>
          <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm mb-1">
            {data.title}
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200/80">
            {data.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Data table component - Perplexity style.
 */
interface DataTableProps {
  data: DataTableData;
  className?: string;
}

export function DataTable({ data, className }: DataTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700',
        className
      )}
    >
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
        <thead className="bg-neutral-50 dark:bg-neutral-800">
          <tr>
            {data.headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700">
          {data.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.caption && (
        <p className="px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
          {data.caption}
        </p>
      )}
    </motion.div>
  );
}

/**
 * UI Components list renderer - Perplexity style.
 */
interface UIComponentsListProps {
  components: UIComponent[];
  className?: string;
}

export function UIComponentsList({ components, className }: UIComponentsListProps) {
  const nonSourceCards = components.filter(
    (c) => c.type !== UIComponentType.SOURCE_CARD
  );
  
  const sourceCards = components.filter(
    (c) => c.type === UIComponentType.SOURCE_CARD
  );

  if (nonSourceCards.length === 0 && sourceCards.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Source cards - horizontal scrollable on mobile */}
      {sourceCards.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {sourceCards.map((component, index) => (
            <div key={component.id} className="flex-shrink-0 w-64">
              <UIComponentRenderer component={component} />
            </div>
          ))}
        </div>
      )}

      {/* Non-source card components */}
      {nonSourceCards.map((component) => (
        <UIComponentRenderer key={component.id} component={component} />
      ))}
    </div>
  );
}
