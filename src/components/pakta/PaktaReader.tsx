'use client';

/**
 * src/components/pakta/PaktaReader.tsx
 * Renders pakta markdown content and detects when the user has scrolled to the bottom.
 *
 * Props:
 *   contentMarkdown — raw markdown string
 *   onReachBottom   — called once when the bottom sentinel enters the viewport
 *   reachBottom     — current state (to show indicator)
 */

import { useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ScrollText, CheckCircle2 } from 'lucide-react';

interface PaktaReaderProps {
  contentMarkdown: string;
  onReachBottom: () => void;
  reachBottom?: boolean;
}

export function PaktaReader({ contentMarkdown, onReachBottom, reachBottom }: PaktaReaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasTriggered = useRef(false);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (entry.isIntersecting && !hasTriggered.current) {
        hasTriggered.current = true;
        onReachBottom();
      }
    },
    [onReachBottom]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.5,
      rootMargin: '0px',
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersection]);

  return (
    <div className="relative">
      {/* Scroll indicator */}
      {!reachBottom && (
        <div className="sticky top-0 z-10 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          <ScrollText className="h-4 w-4 flex-shrink-0" />
          <span>Baca sampai bawah sebelum melanjutkan</span>
        </div>
      )}

      {reachBottom && (
        <div className="sticky top-0 z-10 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>Anda telah membaca seluruh dokumen</span>
        </div>
      )}

      {/* Document content */}
      <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-gray-800 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100">
          <ReactMarkdown>{contentMarkdown}</ReactMarkdown>
        </div>

        {/* Bottom sentinel — intersection triggers onReachBottom */}
        <div ref={sentinelRef} className="h-4 mt-4" aria-hidden="true" />
      </div>
    </div>
  );
}
