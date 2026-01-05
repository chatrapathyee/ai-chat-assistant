/**
 * Perplexity-style chat input component.
 * Clean search bar design with attachment support.
 */

'use client';

import React, { useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { uploadPDF } from '@/lib/api';
import { usePDFListStore } from '@/store';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
}

export interface ChatInputHandle {
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask anything...',
  compact = false,
}, ref) {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPDF = usePDFListStore((state) => state.addPDF);
  const removePDF = usePDFListStore((state) => state.removePDF);
  const pdfs = usePDFListStore((state) => state.pdfs);

  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedMessage = message.trim();
      if (trimmedMessage && !disabled) {
        onSend(trimmedMessage);
        setMessage('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    },
    [message, disabled, onSend]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    },
    [handleSubmit]
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value);
      const textarea = e.target;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    },
    []
  );

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    try {
      const response = await uploadPDF(file);
      addPDF({
        pdf_id: response.pdf_id,
        filename: response.filename,
        title: response.filename.replace('.pdf', ''),
        page_count: response.page_count,
      });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload PDF. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* PDF attachments - shown above input */}
      {pdfs.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {pdfs.map((pdf) => (
            <motion.div
              key={pdf.pdf_id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                'flex items-center gap-2 px-3 py-2',
                'bg-blue-50 dark:bg-blue-900/20',
                'border border-blue-200 dark:border-blue-800',
                'rounded-lg group'
              )}
            >
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4z"/>
              </svg>
              <span className="text-sm text-blue-700 dark:text-blue-300 max-w-[150px] truncate">
                {pdf.filename}
              </span>
              <span className="text-xs text-blue-500 dark:text-blue-400">
                ({pdf.page_count} pages)
              </span>
              <button
                type="button"
                onClick={() => removePDF(pdf.pdf_id)}
                className={cn(
                  'p-1 rounded-full',
                  'text-blue-400 hover:text-red-500',
                  'hover:bg-red-100 dark:hover:bg-red-900/30',
                  'transition-colors'
                )}
                title="Remove PDF"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex items-end gap-2',
          'bg-white dark:bg-neutral-800',
          'border-2',
          'shadow-lg shadow-neutral-200/50 dark:shadow-neutral-900/50',
          'rounded-2xl',
          'transition-all duration-200',
          isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : isFocused 
              ? 'border-blue-500 ring-4 ring-blue-500/10' 
              : 'border-neutral-200 dark:border-neutral-700',
          compact ? 'p-2' : 'p-3 px-4'
        )}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 dark:bg-blue-900/30 rounded-2xl z-10">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              <span>Drop PDF here</span>
            </div>
          </div>
        )}

        {/* Attach file button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className={cn(
            'flex-shrink-0 p-2.5 rounded-xl',
            'text-neutral-400 hover:text-blue-500',
            'hover:bg-blue-50 dark:hover:bg-blue-900/20',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Upload PDF"
        >
          {isUploading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          )}
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent',
            'text-neutral-900 dark:text-neutral-100',
            'placeholder-neutral-400 dark:placeholder-neutral-500',
            'focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            compact ? 'min-h-[36px] py-1.5 text-[15px]' : 'min-h-[48px] py-3 text-base'
          )}
        />

        {/* Send button */}
        <motion.button
          type="submit"
          disabled={disabled || !message.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'flex-shrink-0 p-2.5 rounded-xl',
            'transition-all duration-200',
            message.trim() && !disabled
              ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-500/25'
              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500',
            'disabled:cursor-not-allowed'
          )}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </motion.button>
      </motion.div>

      {/* Footer info */}
      <div className="flex items-center justify-end mt-3 px-2">
        <div className="flex items-center gap-1 text-xs text-neutral-400">
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-medium">Enter</kbd>
          <span>to send</span>
          <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">•</span>
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-medium">/</kbd>
          <span>to focus</span>
        </div>
      </div>
    </form>
  );
});
