/**
 * src/components/shared/MarkdownRender.tsx
 * Sanitized markdown renderer with theme-consistent styling.
 * Uses react-markdown + remark-gfm.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRenderProps {
  content: string;
  className?: string;
}

export function MarkdownRender({ content, className = '' }: MarkdownRenderProps) {
  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none
        prose-headings:font-semibold prose-headings:text-gray-800 dark:prose-headings:text-gray-200
        prose-p:text-gray-700 dark:prose-p:text-gray-300
        prose-a:text-sky-600 dark:prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline
        prose-code:bg-sky-50 dark:prose-code:bg-sky-900/30 prose-code:text-sky-700 dark:prose-code:text-sky-300
        prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
        prose-pre:bg-gray-900 dark:prose-pre:bg-gray-800
        prose-blockquote:border-l-sky-400 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
        prose-li:text-gray-700 dark:prose-li:text-gray-300
        prose-strong:text-gray-800 dark:prose-strong:text-gray-200
        ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
