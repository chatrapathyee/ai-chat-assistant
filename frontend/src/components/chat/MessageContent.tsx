/**
 * Perplexity-style message content component.
 * Renders message text with inline citations and markdown support.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CitationBadge } from './CitationBadge';
import type { Citation } from '@/types';

interface MessageContentProps {
  content: string;
  citations: Citation[];
  isStreaming?: boolean;
  className?: string;
}

export function MessageContent({
  content,
  citations,
  isStreaming = false,
  className,
}: MessageContentProps) {
  // Create a map of citation numbers to citation objects
  const citationMap = React.useMemo(() => {
    const map = new Map<number, Citation>();
    citations.forEach((c) => map.set(c.number, c));
    return map;
  }, [citations]);

  // Render content with inline citations
  const renderContentWithCitations = (text: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    const citationRegex = /\[(\d+)\]/g;
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    while ((match = citationRegex.exec(text)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index);
        result.push(
          <span key={`text-${keyIndex++}`}>{textBefore}</span>
        );
      }

      // Add citation badge (inline)
      const citationNum = parseInt(match[1], 10);
      result.push(
        <CitationBadge
          key={`cite-${keyIndex++}`}
          number={citationNum}
          citation={citationMap.get(citationNum)}
          className="mx-0.5"
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      result.push(
        <span key={`text-${keyIndex++}`}>{text.slice(lastIndex)}</span>
      );
    }

    return result;
  };

  // Render markdown with citations
  const renderMarkdown = (text: string): React.ReactNode => {
    // Handle code blocks first
    if (text.includes('```')) {
      const parts = text.split(/(```[\s\S]*?```)/);
      return (
        <>
          {parts.map((part, i) => {
            if (part.startsWith('```')) {
              const codeContent = part.slice(3, -3);
              const firstNewline = codeContent.indexOf('\n');
              const code = firstNewline > 0 ? codeContent.slice(firstNewline + 1) : codeContent;
              return (
                <pre key={i} className="bg-neutral-900 dark:bg-neutral-950 rounded-lg p-4 my-3 overflow-x-auto">
                  <code className="text-sm text-neutral-100 font-mono">{code}</code>
                </pre>
              );
            }
            return <React.Fragment key={i}>{renderParagraphs(part)}</React.Fragment>;
          })}
        </>
      );
    }
    return renderParagraphs(text);
  };

  // Render paragraphs with proper spacing
  const renderParagraphs = (text: string): React.ReactNode => {
    // Split by double newlines for paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    return (
      <>
        {paragraphs.map((para, pIdx) => {
          if (!para.trim()) return null;
          
          // Handle bullet points
          if (para.includes('\n- ') || para.startsWith('- ')) {
            const lines = para.split('\n');
            return (
              <ul key={pIdx} className="list-disc list-inside mb-3 space-y-1">
                {lines.map((line, lIdx) => {
                  const bulletContent = line.replace(/^-\s*/, '');
                  if (!bulletContent.trim()) return null;
                  return (
                    <li key={lIdx} className="text-neutral-700 dark:text-neutral-300">
                      {renderInlineWithCitations(bulletContent)}
                    </li>
                  );
                })}
              </ul>
            );
          }

          // Handle numbered lists
          if (/^\d+\.\s/.test(para)) {
            const lines = para.split('\n');
            return (
              <ol key={pIdx} className="list-decimal list-inside mb-3 space-y-1">
                {lines.map((line, lIdx) => {
                  const listContent = line.replace(/^\d+\.\s*/, '');
                  if (!listContent.trim()) return null;
                  return (
                    <li key={lIdx} className="text-neutral-700 dark:text-neutral-300">
                      {renderInlineWithCitations(listContent)}
                    </li>
                  );
                })}
              </ol>
            );
          }

          // Regular paragraph - handle single newlines as line breaks
          const lines = para.split('\n');
          return (
            <p key={pIdx} className="mb-3 last:mb-0 text-neutral-700 dark:text-neutral-300">
              {lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {renderInlineWithCitations(line)}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          );
        })}
      </>
    );
  };

  // Render inline formatting (bold, italic) with citations
  const renderInlineWithCitations = (text: string): React.ReactNode => {
    // First handle bold text
    const boldParts = text.split(/(\*\*.*?\*\*)/);
    
    return boldParts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldContent = part.slice(2, -2);
        return (
          <strong key={i} className="font-semibold text-neutral-900 dark:text-neutral-100">
            {renderContentWithCitations(boldContent)}
          </strong>
        );
      }
      
      // Handle italic text within non-bold parts
      const italicParts = part.split(/(\*.*?\*)/);
      return italicParts.map((italicPart, j) => {
        if (italicPart.startsWith('*') && italicPart.endsWith('*') && !italicPart.startsWith('**')) {
          const italicContent = italicPart.slice(1, -1);
          return (
            <em key={`${i}-${j}`} className="italic">
              {renderContentWithCitations(italicContent)}
            </em>
          );
        }
        return <React.Fragment key={`${i}-${j}`}>{renderContentWithCitations(italicPart)}</React.Fragment>;
      });
    });
  };

  return (
    <div className={cn('text-[15px] leading-7', className)}>
      {renderMarkdown(content)}

      {/* Streaming cursor - Perplexity style */}
      {isStreaming && (
        <span className="inline-block w-0.5 h-5 ml-0.5 bg-blue-500 animate-pulse rounded-full align-middle" />
      )}
    </div>
  );
}

/**
 * Streaming text component with progressive rendering.
 */
interface StreamingTextProps {
  text: string;
  className?: string;
}

export function StreamingText({ text, className }: StreamingTextProps) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      {text}
    </motion.span>
  );
}
