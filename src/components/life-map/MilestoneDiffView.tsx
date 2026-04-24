'use client';

/**
 * src/components/life-map/MilestoneDiffView.tsx
 * NAWASENA M07 — Side-by-side milestone progress comparison (M1/M2/M3).
 */

import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { computeMilestoneDiff } from '@/lib/life-map/diff-compute';
import { cn } from '@/lib/utils';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon, ClockIcon } from 'lucide-react';

type MilestoneKey = 'M1' | 'M2' | 'M3';

interface MilestoneUpdateData {
  milestone: MilestoneKey;
  progressText: string;
  progressPercent: number;
  reflectionText: string;
  recordedAt: string;
  isLate: boolean;
}

interface MilestoneDiffViewProps {
  updates: MilestoneUpdateData[];
  className?: string;
}

function PercentDeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;

  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
        <TrendingUpIcon className="h-3 w-3" />+{delta}%
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-500 dark:text-red-400 text-xs font-medium">
        <TrendingDownIcon className="h-3 w-3" />{delta}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-gray-400 text-xs">
      <MinusIcon className="h-3 w-3" />0%
    </span>
  );
}

const MILESTONE_LABELS: Record<MilestoneKey, string> = {
  M1: 'M1 — Awal',
  M2: 'M2 — Tengah',
  M3: 'M3 — Akhir',
};

export function MilestoneDiffView({ updates, className }: MilestoneDiffViewProps) {
  const diff = computeMilestoneDiff(
    updates.map((u) => ({
      ...u,
      recordedAt: new Date(u.recordedAt),
    })),
  );

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-3', className)}>
      {diff.map(({ milestone, data, percentDelta }) => (
        <div
          key={milestone}
          className={cn(
            'rounded-xl border p-4 space-y-3',
            data
              ? 'bg-white dark:bg-slate-800 border-sky-100 dark:border-sky-900'
              : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-gray-700 opacity-60',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              {MILESTONE_LABELS[milestone]}
            </span>
            {data && <PercentDeltaBadge delta={percentDelta} />}
          </div>

          {data ? (
            <>
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Pencapaian</span>
                  <span className="font-semibold text-sky-600 dark:text-sky-400">
                    {data.progressPercent}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-sky-500 h-2 rounded-full"
                    style={{ width: `${data.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Progress text */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Progres</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-4">
                  {data.progressText}
                </p>
              </div>

              {/* Reflection text */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Refleksi</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
                  {data.reflectionText}
                </p>
              </div>

              {/* Date + late badge */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <ClockIcon className="h-3 w-3" />
                {format(new Date(data.recordedAt), 'd MMM yyyy', { locale: localeId })}
                {data.isLate && (
                  <span className="text-amber-600 dark:text-amber-400 ml-1">(terlambat)</span>
                )}
              </div>
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">Belum ada update</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
