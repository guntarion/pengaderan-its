'use client';

/**
 * src/components/life-map/LifeMapGoalCard.tsx
 * NAWASENA M07 — Card displaying a single Life Map goal.
 */

import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { MilestoneRow } from './MilestoneStatusBadge';
import { cn } from '@/lib/utils';
import { CalendarIcon, LockIcon, ShareIcon, ChevronRightIcon } from 'lucide-react';

type MilestoneKey = 'M1' | 'M2' | 'M3';
type LifeMapStatus = 'ACTIVE' | 'ACHIEVED' | 'ADJUSTED';

interface GoalSummary {
  id: string;
  area: string;
  goalText: string;
  metric: string;
  deadline: string;
  status: LifeMapStatus;
  sharedWithKasuh: boolean;
  updates: Array<{
    id: string;
    milestone: MilestoneKey;
    progressPercent: number;
    isLate: boolean;
  }>;
}

const STATUS_STYLES: Record<LifeMapStatus, string> = {
  ACTIVE: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  ACHIEVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  ADJUSTED: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
};

const STATUS_LABELS: Record<LifeMapStatus, string> = {
  ACTIVE: 'Aktif',
  ACHIEVED: 'Tercapai',
  ADJUSTED: 'Direvisi',
};

interface LifeMapGoalCardProps {
  goal: GoalSummary;
  className?: string;
  href?: string;
}

export function LifeMapGoalCard({ goal, className, href }: LifeMapGoalCardProps) {
  const deadlineDate = new Date(goal.deadline);
  const isPastDeadline = deadlineDate < new Date() && goal.status === 'ACTIVE';

  const cardContent = (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5',
        'hover:border-sky-300 dark:hover:border-sky-700 transition-colors',
        href && 'cursor-pointer group',
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{goal.goalText}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              'text-xs px-2.5 py-1 rounded-full border font-medium',
              STATUS_STYLES[goal.status],
            )}
          >
            {STATUS_LABELS[goal.status]}
          </span>
          {href && (
            <ChevronRightIcon className="h-4 w-4 text-gray-400 group-hover:text-sky-500 transition-colors" />
          )}
        </div>
      </div>

      {/* Metric */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-1">
        <span className="font-medium text-gray-700 dark:text-gray-300">Ukuran sukses: </span>
        {goal.metric}
      </p>

      {/* Milestone badges */}
      <MilestoneRow submittedMilestones={goal.updates} className="mb-3" />

      {/* Footer */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span
          className={cn(
            'flex items-center gap-1',
            isPastDeadline && 'text-red-500 dark:text-red-400',
          )}
        >
          <CalendarIcon className="h-3 w-3" />
          {format(deadlineDate, 'd MMM yyyy', { locale: localeId })}
          {isPastDeadline && ' (terlewat)'}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          {goal.sharedWithKasuh ? (
            <>
              <ShareIcon className="h-3 w-3 text-sky-500" />
              <span className="text-sky-600 dark:text-sky-400">Dibagikan</span>
            </>
          ) : (
            <>
              <LockIcon className="h-3 w-3" />
              Privat
            </>
          )}
        </span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
}
