'use client';

/**
 * src/components/portfolio/PortfolioLifeMapSection.tsx
 * NAWASENA M07 — Portfolio section: Life Map summary.
 */

import Link from 'next/link';
import { MilestoneRow } from '@/components/life-map/MilestoneStatusBadge';
import { Button } from '@/components/ui/button';
import { TargetIcon, ChevronRightIcon, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type MilestoneKey = 'M1' | 'M2' | 'M3';

interface AreaGoal {
  area: string;
  status: string;
  goalText: string;
  milestonesDone: MilestoneKey[];
}

interface PortfolioLifeMapSectionProps {
  totalGoals: number;
  activeGoals: number;
  achievedGoals: number;
  byArea: AreaGoal[];
  readonly?: boolean;
}

const AREA_LABELS: Record<string, string> = {
  PERSONAL_GROWTH: '🌱 Kepribadian',
  STUDI_KARIR: '📚 Studi & Karir',
  FINANSIAL: '💰 Finansial',
  KESEHATAN: '💪 Kesehatan',
  SOSIAL: '🤝 Sosial',
  KELUARGA: '🏡 Keluarga',
};

export function PortfolioLifeMapSection({
  totalGoals,
  activeGoals,
  achievedGoals,
  byArea,
  readonly = false,
}: PortfolioLifeMapSectionProps) {
  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TargetIcon className="h-4 w-4 text-violet-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Life Map</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{activeGoals} aktif</span>
          <span className="text-emerald-600 dark:text-emerald-400">{achievedGoals} tercapai</span>
          {!readonly && (
            <Link href="/dashboard/life-map">
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-xl gap-1">
                Lihat Semua <ChevronRightIcon className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {totalGoals === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Belum ada goal Life Map
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {byArea.map((goal, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {AREA_LABELS[goal.area] ?? goal.area}
                </span>
                <span className={cn('text-xs', goal.status === 'ACHIEVED' ? 'text-emerald-500' : goal.status === 'ADJUSTED' ? 'text-amber-500' : 'text-sky-500')}>
                  {goal.status === 'ACHIEVED' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : goal.status === 'ADJUSTED' ? (
                    <RefreshCw className="h-3.5 w-3.5" />
                  ) : null}
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{goal.goalText}</p>
              <MilestoneRow
                submittedMilestones={goal.milestonesDone.map((m) => ({
                  milestone: m,
                  progressPercent: 0,
                  isLate: false,
                }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
