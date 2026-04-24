'use client';

/**
 * src/components/portfolio/PortfolioTimeCapsuleSection.tsx
 * NAWASENA M07 — Portfolio section: Time Capsule summary.
 */

import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { getMoodEmoji } from '@/components/time-capsule/MoodSelector';
import { Button } from '@/components/ui/button';
import { NotebookPenIcon, ShareIcon, LockIcon, ChevronRightIcon } from 'lucide-react';

interface TimeCapsuleEntry {
  id: string;
  title: string | null;
  body: string;
  mood: number | null;
  publishedAt: string;
  sharedWithKasuh: boolean;
}

interface PortfolioTimeCapsuleSectionProps {
  totalEntries: number;
  sharedEntries: number;
  recentEntries: TimeCapsuleEntry[];
  readonly?: boolean;
}

export function PortfolioTimeCapsuleSection({
  totalEntries,
  sharedEntries,
  recentEntries,
  readonly = false,
}: PortfolioTimeCapsuleSectionProps) {
  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <NotebookPenIcon className="h-4 w-4 text-sky-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Time Capsule</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{totalEntries} catatan</span>
          <span className="text-sky-600 dark:text-sky-400">{sharedEntries} dibagikan</span>
          {!readonly && (
            <Link href="/dashboard/time-capsule">
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-xl gap-1">
                Lihat Semua <ChevronRightIcon className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {recentEntries.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Belum ada catatan Time Capsule
        </div>
      ) : (
        <div className="space-y-2">
          {recentEntries.slice(0, 5).map((entry) => (
            <Link
              key={entry.id}
              href={readonly ? '#' : `/dashboard/time-capsule/${entry.id}`}
              className={readonly ? 'pointer-events-none' : ''}
            >
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900 px-4 py-3 hover:border-sky-300 dark:hover:border-sky-700 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {entry.mood && <span className="text-sm">{getMoodEmoji(entry.mood)}</span>}
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {entry.title ?? <span className="italic text-gray-400">Tanpa judul</span>}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {entry.body.replace(/[#*`>[\]]/g, '').slice(0, 100)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {entry.sharedWithKasuh ? (
                      <ShareIcon className="h-3 w-3 text-sky-500" />
                    ) : (
                      <LockIcon className="h-3 w-3 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-400">
                      {format(new Date(entry.publishedAt), 'd MMM', { locale: localeId })}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {recentEntries.length > 5 && !readonly && (
            <Link href="/dashboard/time-capsule" className="block text-center text-xs text-sky-600 dark:text-sky-400 pt-1 hover:underline">
              Lihat {recentEntries.length - 5} catatan lainnya...
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
