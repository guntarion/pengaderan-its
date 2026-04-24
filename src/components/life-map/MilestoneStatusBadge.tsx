'use client';

/**
 * src/components/life-map/MilestoneStatusBadge.tsx
 * NAWASENA M07 — Displays milestone submission status badges (M1/M2/M3).
 */

import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

type MilestoneKey = 'M1' | 'M2' | 'M3';

interface MilestoneStatusProps {
  milestone: MilestoneKey;
  submitted: boolean;
  isLate?: boolean;
  progressPercent?: number;
  className?: string;
}

const MILESTONE_LABELS: Record<MilestoneKey, string> = {
  M1: 'M1 — Awal F2',
  M2: 'M2 — Tengah F2',
  M3: 'M3 — Akhir F2',
};

export function MilestoneStatusBadge({
  milestone,
  submitted,
  isLate = false,
  progressPercent,
  className,
}: MilestoneStatusProps) {
  if (submitted) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
          isLate
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
          className,
        )}
      >
        {isLate ? (
          <AlertCircle className="h-3 w-3" />
        ) : (
          <CheckCircle2 className="h-3 w-3" />
        )}
        {MILESTONE_LABELS[milestone]}
        {progressPercent !== undefined && (
          <span className="ml-1 opacity-80">{progressPercent}%</span>
        )}
        {isLate && <span className="opacity-70">(terlambat)</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      {MILESTONE_LABELS[milestone]}
      <span className="opacity-70">belum diisi</span>
    </div>
  );
}

/**
 * Row of 3 milestone badges for a goal.
 */
interface MilestoneRowProps {
  submittedMilestones: Array<{
    milestone: MilestoneKey;
    progressPercent: number;
    isLate: boolean;
  }>;
  className?: string;
}

export function MilestoneRow({ submittedMilestones, className }: MilestoneRowProps) {
  const keys: MilestoneKey[] = ['M1', 'M2', 'M3'];

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {keys.map((key) => {
        const update = submittedMilestones.find((u) => u.milestone === key);
        return (
          <MilestoneStatusBadge
            key={key}
            milestone={key}
            submitted={!!update}
            isLate={update?.isLate}
            progressPercent={update?.progressPercent}
          />
        );
      })}
    </div>
  );
}
