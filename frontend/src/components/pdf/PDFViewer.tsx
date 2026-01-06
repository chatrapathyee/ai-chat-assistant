/**
 * PDF Viewer component with navigation controls.
 * Uses react-pdf for rendering PDF documents.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePDFViewerStore } from '@/store';
import { getPDFFileUrl, getPDFMetadata, searchPDF } from '@/lib/api';
import type { PDFMetadata, PDFSearchResult } from '@/types';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

interface PDFViewerProps {
  className?: string;
}

export function PDFViewer({ className }: PDFViewerProps) {
  const {
    isOpen,
    pdfId,
    pageNumber,
    highlightText,
    scale,
    closePDF,
    setPage,
    zoomIn,
    zoomOut,
    resetZoom,
  } = usePDFViewerStore();

  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<PDFMetadata | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<PDFSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load PDF metadata
  useEffect(() => {
    if (pdfId) {
      getPDFMetadata(pdfId)
        .then(setMetadata)
        .catch((err) => console.error('Failed to load PDF metadata:', err));
    }
  }, [pdfId]);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!pdfId || !searchText.trim()) return;
    
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const response = await searchPDF(pdfId, searchText.trim());
      setSearchResults(response);
    } catch (err: unknown) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [pdfId, searchText]);

  // Handle search result click
  const handleSearchResultClick = useCallback((pageNumber: number) => {
    setPage(pageNumber);
    setShowSearchResults(false);
  }, [setPage]);

  // Handle document load success
  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setLoading(false);
      setError(null);
    },
    []
  );

  // Handle document load error
  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF load error:', err);
    setError('Failed to load PDF document');
    setLoading(false);
  }, []);

  // Navigation handlers
  const goToPrevPage = useCallback(() => {
    setPage(Math.max(1, pageNumber - 1));
  }, [pageNumber, setPage]);

  const goToNextPage = useCallback(() => {
    setPage(Math.min(numPages, pageNumber + 1));
  }, [pageNumber, numPages, setPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goToPrevPage();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          goToNextPage();
          break;
        case 'Escape':
          closePDF();
          break;
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            resetZoom();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrevPage, goToNextPage, closePDF, zoomIn, zoomOut, resetZoom]);

  if (!isOpen || !pdfId) {
    return null;
  }

  const pdfUrl = getPDFFileUrl(pdfId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={cn(
          'flex flex-col h-full',
          'bg-neutral-50 dark:bg-neutral-950',
          className
        )}
      >
        {/* Header - Perplexity style */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm text-neutral-900 dark:text-white truncate">
                {metadata?.title || 'Document'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {metadata?.filename}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={closePDF}
            className={cn(
              'p-2 rounded-lg',
              'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800',
              'transition-colors'
            )}
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar - Perplexity style */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className={cn(
                'p-1.5 rounded-lg',
                'text-neutral-600 dark:text-neutral-400',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                'transition-colors'
              )}
              title="Previous page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
              <input
                type="number"
                min={1}
                max={numPages}
                value={pageNumber}
                onChange={(e) => {
                  const page = parseInt(e.target.value, 10);
                  if (page >= 1 && page <= numPages) {
                    setPage(page);
                  }
                }}
                className={cn(
                  'w-10 text-center rounded-md py-1',
                  'bg-neutral-100 dark:bg-neutral-800',
                  'border-0',
                  'text-neutral-900 dark:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/20'
                )}
              />
              <span className="text-neutral-400">/</span>
              <span>{numPages}</span>
            </div>

            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className={cn(
                'p-1.5 rounded-lg',
                'text-neutral-600 dark:text-neutral-400',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                'transition-colors'
              )}
              title="Next page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className={cn(
                'p-1.5 rounded-lg',
                'text-neutral-600 dark:text-neutral-400',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                'transition-colors'
              )}
              title="Zoom out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>

            <span className="text-sm text-neutral-500 dark:text-neutral-400 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              className={cn(
                'p-1.5 rounded-lg',
                'text-neutral-600 dark:text-neutral-400',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                'transition-colors'
              )}
              title="Zoom in"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <button
              onClick={resetZoom}
              className={cn(
                'p-1.5 rounded-lg ml-1',
                'text-neutral-600 dark:text-neutral-400',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'transition-colors'
              )}
              title="Reset zoom"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search in document..."
                  className={cn(
                    'w-full pl-9 pr-4 py-2 text-sm rounded-lg',
                    'bg-neutral-100 dark:bg-neutral-800',
                    'border border-neutral-200 dark:border-neutral-700',
                    'text-neutral-900 dark:text-white',
                    'placeholder-neutral-500 dark:placeholder-neutral-400',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                  )}
                />
                <svg 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={handleSearch}
                disabled={!searchText.trim() || isSearching}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg',
                  'bg-blue-500 hover:bg-blue-600 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
              >
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Search'
                )}
              </button>
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showSearchResults && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    'absolute top-full left-0 right-0 mt-2 z-50',
                    'bg-white dark:bg-neutral-800 rounded-lg shadow-lg',
                    'border border-neutral-200 dark:border-neutral-700',
                    'max-h-64 overflow-y-auto'
                  )}
                >
                  <div className="p-2">
                    <div className="flex items-center justify-between px-2 py-1 mb-1">
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                      </span>
                      <button
                        onClick={() => setShowSearchResults(false)}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearchResultClick(result.page_number)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-md',
                          'hover:bg-neutral-100 dark:hover:bg-neutral-700',
                          'transition-colors'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-500 dark:text-blue-400">
                            Page {result.page_number}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 line-clamp-2">
                          ...{result.snippet}...
                        </p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* No results message */}
            {showSearchResults && searchResults.length === 0 && !isSearching && searchText.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                  No results found for &ldquo;{searchText}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Highlight info */}
        {highlightText && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/50">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <span className="font-medium">Highlighted:</span>{' '}
              <span className="italic">&ldquo;{highlightText.slice(0, 100)}...&rdquo;</span>
            </p>
          </div>
        )}

        {/* PDF content */}
        <div className="flex-1 overflow-auto p-6 bg-neutral-100 dark:bg-neutral-900">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-blue-500 animate-spin" />
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  Loading PDF...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              className="shadow-xl rounded-lg overflow-hidden"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                className="bg-white"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default PDFViewer;
