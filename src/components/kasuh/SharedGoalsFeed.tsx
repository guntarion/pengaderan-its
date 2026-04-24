'use client';

/**
 * src/components/kasuh/SharedGoalsFeed.tsx
 * NAWASENA M07 — Read-only feed of shared Life Map goals for Kasuh view.
 */

import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { MilestoneRow } from '@/components/life-map/MilestoneStatusBadge';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

type MilestoneKey = 'M1' | 'M2' | 'M3';

interface SharedGoal {
  id: string;
  area: string;
  goalText: string;
  metric: string;
  status: string;
  deadline: string;
  updates: Array<{
    id: string;
    milestone: string;
    progressPercent: number;
    isLate: boolean;
    recordedAt: string;
  }>;
}

const AREA_LABELS: Record<string, string> = {
  PERSONAL_GROWTH: '🌱 Kepribadian & Pertumbuhan',
  STUDI_KARIR: '📚 Studi & Karir',
  FINANSIAL: '💰 Finansial',
  KESEHATAN: '💪 Kesehatan',
  SOSIAL: '🤝 Sosial & Komunitas',
  KELUARGA: '🏡 Keluarga & Relasi',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  ACHIEVED: 'Tercapai',
  ADJUSTED: 'Direvisi',
};

interface SharedGoalsFeedProps {
  goals: SharedGoal[];
  className?: string;
}

export function SharedGoalsFeed({ goals, className }: SharedGoalsFeedProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
        Belum ada goal yang dibagikan
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {goals.map((goal) => {
        const isPastDeadline = new Date(goal.deadline) < new Date() && goal.status === 'ACTIVE';

        return (
          <div
            key={goal.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                  {AREA_LABELS[goal.area] ?? goal.area}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{goal.goalText}</p>
              </div>
              <span className="text-xs px-2 py-0.5 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 rounded-full border border-sky-200 dark:border-sky-800 shrink-0">
                {STATUS_LABELS[goal.status] ?? goal.status}
              </span>
            </div>

            {/* Metric */}
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Ukuran: </span>
              {goal.metric}
            </p>

            {/* Milestone badges */}
            <MilestoneRow
              submittedMilestones={goal.updates.map((u) => ({
                milestone: u.milestone as MilestoneKey,
                progressPercent: u.progressPercent,
                isLate: u.isLate,
              }))}
            />

            {/* Deadline */}
            <p
              className={cn(
                'flex items-center gap-1 text-xs',
                isPastDeadline
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-gray-400 dark:text-gray-500',
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              {format(new Date(goal.deadline), 'd MMMM yyyy', { locale: localeId })}
              {isPastDeadline && ' (terlewat)'}
            </p>
          </div>
        );
      })}
    </div>
  );
}
