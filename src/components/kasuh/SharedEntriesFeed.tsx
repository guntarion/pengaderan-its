'use client';

/**
 * src/components/kasuh/SharedEntriesFeed.tsx
 * NAWASENA M07 — Read-only feed of shared Time Capsule entries for Kasuh view.
 */

import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { TimeCapsulePreview } from '@/components/time-capsule/TimeCapsulePreview';
import { getMoodEmoji, getMoodLabel } from '@/components/time-capsule/MoodSelector';
import { cn } from '@/lib/utils';

interface SharedEntry {
  id: string;
  title: string | null;
  body: string;
  mood: number | null;
  publishedAt: string | null;
  attachments: Array<{ id: string; mimeType: string; originalFilename: string; size: number }>;
}

interface SharedEntriesFeedProps {
  entries: SharedEntry[];
  className?: string;
}

export function SharedEntriesFeed({ entries, className }: SharedEntriesFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
        Belum ada catatan yang dibagikan
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              {entry.title && (
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-0.5">
                  {entry.title}
                </h3>
              )}
              {entry.publishedAt && (
                <p className="text-xs text-gray-400">
                  {format(new Date(entry.publishedAt), 'EEEE, d MMMM yyyy · HH:mm', { locale: localeId })}
                </p>
              )}
            </div>
            {entry.mood && (
              <span
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white dark:bg-slate-800 rounded-full border border-sky-100 dark:border-sky-900 shrink-0"
                title={getMoodLabel(entry.mood)}
              >
                {getMoodEmoji(entry.mood)}
                <span className="text-gray-500 dark:text-gray-400">{getMoodLabel(entry.mood)}</span>
              </span>
            )}
          </div>

          {/* Content (read-only) */}
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <TimeCapsulePreview content={entry.body} />
          </div>

          {/* Attachment count */}
          {entry.attachments.length > 0 && (
            <p className="text-xs text-gray-400 mt-3">
              📎 {entry.attachments.length} lampiran (tidak dapat diunduh dari tampilan ini)
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
