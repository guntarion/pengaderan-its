'use client';

/**
 * src/components/time-capsule/TimeCapsulePreview.tsx
 * NAWASENA M07 — Markdown preview renderer for Time Capsule entries.
 *
 * Uses react-markdown + remark-gfm for safe rendering.
 * No rehype-raw — raw HTML is not allowed (XSS prevention).
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface TimeCapsulePreviewProps {
  content: string;
  className?: string;
}

export function TimeCapsulePreview({ content, className }: TimeCapsulePreviewProps) {
  if (!content) {
    return (
      <div className="text-sm text-gray-400 italic">
        Tidak ada konten untuk ditampilkan.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none',
        'prose-headings:text-gray-800 dark:prose-headings:text-gray-100',
        'prose-p:text-gray-700 dark:prose-p:text-gray-300',
        'prose-strong:text-gray-900 dark:prose-strong:text-gray-100',
        'prose-em:text-gray-700 dark:prose-em:text-gray-300',
        'prose-blockquote:border-sky-400 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400',
        'prose-code:text-sky-700 dark:prose-code:text-sky-300',
        'prose-code:bg-sky-50 dark:prose-code:bg-sky-900/30',
        'prose-li:text-gray-700 dark:prose-li:text-gray-300',
        'prose-a:text-sky-600 dark:prose-a:text-sky-400',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Override img to prevent external URL loading (XSS prevention)
          img: ({ src, alt }) => {
            // Only allow relative URLs or S3 bucket URLs
            const isSafe = !src || src.startsWith('/') || src.startsWith('data:') || src.includes('.digitaloceanspaces.com') || src.includes('.amazonaws.com');
            if (!isSafe) {
              return (
                <span className="text-xs text-gray-400 italic">[Gambar dari URL eksternal tidak ditampilkan]</span>
              );
            }
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={src} alt={alt ?? ''} className="rounded-xl max-w-full" />;
          },
          // Override anchor to add rel attributes
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
