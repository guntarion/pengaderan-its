/**
 * src/components/kegiatan/KegiatanAnchorList.tsx
 * Anchor concepts for a kegiatan (theoretical foundations).
 */

import React from 'react';
import { BookMarked } from 'lucide-react';

interface AnchorRef {
  id: string;
  source: string;
  link: string | null;
  excerpt: string | null;
}

interface KegiatanAnchorListProps {
  anchors: AnchorRef[];
}

export function KegiatanAnchorList({ anchors }: KegiatanAnchorListProps) {
  if (anchors.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
      <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
        <BookMarked className="h-5 w-5 text-violet-500" />
        Landasan Konsep ({anchors.length})
      </h2>
      <div className="space-y-3">
        {anchors.map((anchor) => (
          <div
            key={anchor.id}
            className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800"
          >
            <div className="font-medium text-sm text-violet-800 dark:text-violet-300 mb-1">
              {anchor.source}
            </div>
            {anchor.excerpt && (
              <div className="text-xs text-violet-600 dark:text-violet-400 mb-1 italic">
                {anchor.excerpt}
              </div>
            )}
            {anchor.link && (
              <a
                href={anchor.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
              >
                {anchor.link}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
