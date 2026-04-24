'use client';

/**
 * src/components/life-map/LifeMapOverviewCard.tsx
 * NAWASENA M07 — Per-area overview card for Life Map dashboard.
 *
 * Shows area name, goal count, milestone progress, and CTA to add/view.
 */

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PlusIcon, ChevronRightIcon, CheckCircle2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MilestoneKey = 'M1' | 'M2' | 'M3';

export type LifeArea =
  | 'PERSONAL_GROWTH'
  | 'STUDI_KARIR'
  | 'FINANSIAL'
  | 'KESEHATAN'
  | 'SOSIAL'
  | 'KELUARGA';

const AREA_META: Record<LifeArea, { label: string; color: string; bg: string; border: string; icon: string }> = {
  PERSONAL_GROWTH: {
    label: 'Kepribadian & Pertumbuhan',
    color: 'text-violet-700 dark:text-violet-400',
    bg: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
    border: 'border-violet-200 dark:border-violet-800',
    icon: '🌱',
  },
  STUDI_KARIR: {
    label: 'Studi & Karir',
    color: 'text-sky-700 dark:text-sky-400',
    bg: 'from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20',
    border: 'border-sky-200 dark:border-sky-800',
    icon: '📚',
  },
  FINANSIAL: {
    label: 'Finansial',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: '💰',
  },
  KESEHATAN: {
    label: 'Kesehatan',
    color: 'text-rose-700 dark:text-rose-400',
    bg: 'from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20',
    border: 'border-rose-200 dark:border-rose-800',
    icon: '💪',
  },
  SOSIAL: {
    label: 'Sosial & Komunitas',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: '🤝',
  },
  KELUARGA: {
    label: 'Keluarga & Relasi',
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    icon: '🏡',
  },
};

interface AreaOverview {
  area: LifeArea;
  activeCount: number;
  achievedCount: number;
  adjustedCount: number;
  latestGoal: {
    id: string;
    goalText: string;
  } | null;
  milestonesDone: MilestoneKey[];
}

interface LifeMapOverviewCardProps {
  overview: AreaOverview;
  className?: string;
}

export function LifeMapOverviewCard({ overview, className }: LifeMapOverviewCardProps) {
  const meta = AREA_META[overview.area];
  const milestoneKeys: MilestoneKey[] = ['M1', 'M2', 'M3'];
  const hasGoal = overview.activeCount > 0 || overview.achievedCount > 0;

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 bg-gradient-to-br',
        meta.bg,
        meta.border,
        'space-y-3',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <h3 className={cn('text-sm font-semibold', meta.color)}>{meta.label}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {overview.activeCount} aktif
              {overview.achievedCount > 0 && ` · ${overview.achievedCount} tercapai`}
            </p>
          </div>
        </div>
        {hasGoal ? (
          <Link href={`/dashboard/life-map?area=${overview.area}`}>
            <Button
              size="sm"
              variant="outline"
              className={cn('rounded-xl text-xs gap-1', meta.border)}
            >
              Lihat <ChevronRightIcon className="h-3 w-3" />
            </Button>
          </Link>
        ) : (
          <Link href={`/dashboard/life-map/new?area=${overview.area}`}>
            <Button size="sm" className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs gap-1">
              <PlusIcon className="h-3 w-3" /> Tambah
            </Button>
          </Link>
        )}
      </div>

      {/* Latest active goal snippet */}
      {overview.latestGoal ? (
        <Link href={`/dashboard/life-map/${overview.latestGoal.id}`}>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl px-3 py-2 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors">
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
              {overview.latestGoal.goalText}
            </p>
          </div>
        </Link>
      ) : (
        <div className="bg-white/40 dark:bg-slate-800/40 rounded-xl px-3 py-3 text-center">
          <Target className="h-5 w-5 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Belum ada goal. Tambahkan goal SMART pertamamu!
          </p>
        </div>
      )}

      {/* Milestone progress dots */}
      {hasGoal && (
        <div className="flex items-center gap-2">
          {milestoneKeys.map((mk) => {
            const done = overview.milestonesDone.includes(mk);
            return (
              <div key={mk} className="flex items-center gap-1">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">{mk}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
