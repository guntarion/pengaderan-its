'use client';

/**
 * src/app/(DashboardLayout)/dashboard/life-map/[goalId]/page.tsx
 * NAWASENA M07 — Life Map goal detail page + milestone update list.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { MilestoneRow } from '@/components/life-map/MilestoneStatusBadge';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { SkeletonPageHeader, SkeletonText } from '@/components/shared/skeletons';
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  ShareIcon,
  LockIcon,
  ChevronLeft,
  CheckCircle2,
  RefreshCw,
  TargetIcon,
} from 'lucide-react';

type MilestoneKey = 'M1' | 'M2' | 'M3';
type LifeMapStatus = 'ACTIVE' | 'ACHIEVED' | 'ADJUSTED';

interface GoalDetail {
  id: string;
  area: string;
  goalText: string;
  metric: string;
  whyMatters: string;
  deadline: string;
  achievabilityNote: string | null;
  status: LifeMapStatus;
  sharedWithKasuh: boolean;
  achievedAt: string | null;
  adjustedAt: string | null;
  createdAt: string;
  updates: Array<{
    id: string;
    milestone: MilestoneKey;
    progressText: string;
    progressPercent: number;
    reflectionText: string;
    isLate: boolean;
    recordedAt: string;
    editableUntil: string;
  }>;
}

const STATUS_CONFIG: Record<LifeMapStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: 'Aktif',
    color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800',
    icon: <TargetIcon className="h-3.5 w-3.5" />,
  },
  ACHIEVED: {
    label: 'Tercapai',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  ADJUSTED: {
    label: 'Direvisi',
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    icon: <RefreshCw className="h-3.5 w-3.5" />,
  },
};

const AREA_LABELS: Record<string, string> = {
  PERSONAL_GROWTH: '🌱 Kepribadian & Pertumbuhan',
  STUDI_KARIR: '📚 Studi & Karir',
  FINANSIAL: '💰 Finansial',
  KESEHATAN: '💪 Kesehatan',
  SOSIAL: '🤝 Sosial & Komunitas',
  KELUARGA: '🏡 Keluarga & Relasi',
};

export default function LifeMapGoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const router = useRouter();
  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGoal = useCallback(async () => {
    if (!goalId) return;
    try {
      const res = await fetch(`/api/life-map/${goalId}`);
      const json = await res.json();
      if (json.success) {
        setGoal(json.data as GoalDetail);
      } else {
        toast.apiError(json);
        router.push('/dashboard/life-map');
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [goalId, router]);

  useEffect(() => {
    void fetchGoal();
  }, [fetchGoal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 p-6">
        <div className="container mx-auto max-w-3xl space-y-4">
          <SkeletonPageHeader />
          <SkeletonText lines={6} />
        </div>
      </div>
    );
  }

  if (!goal) return null;

  const statusCfg = STATUS_CONFIG[goal.status];
  const isPastDeadline = new Date(goal.deadline) < new Date() && goal.status === 'ACTIVE';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            labels={{
              'life-map': 'Life Map',
              [goalId]: AREA_LABELS[goal.area] ?? goal.area,
            }}
            className="text-white/70 mb-2 text-sm"
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm opacity-80">{AREA_LABELS[goal.area]}</span>
              </div>
              <p className="text-white/90 text-sm line-clamp-2">{goal.goalText}</p>
            </div>
            <span
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium shrink-0',
                statusCfg.color,
              )}
            >
              {statusCfg.icon}
              {statusCfg.label}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Goal details card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-3 text-xs">
            {/* Deadline */}
            <span
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full border',
                isPastDeadline
                  ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              {format(new Date(goal.deadline), 'd MMMM yyyy', { locale: localeId })}
              {isPastDeadline && ' (terlewat)'}
            </span>

            {/* Share status */}
            {goal.sharedWithKasuh ? (
              <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 px-2.5 py-1 bg-sky-50 dark:bg-sky-900/20 rounded-full border border-sky-200 dark:border-sky-800">
                <ShareIcon className="h-3 w-3" /> Dibagikan ke Kakak Kasuh
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-500 px-2.5 py-1 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
                <LockIcon className="h-3 w-3" /> Privat
              </span>
            )}
          </div>

          {/* Metric */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Ukuran Keberhasilan
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200">{goal.metric}</p>
          </div>

          {/* Why matters */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Mengapa Penting
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200">{goal.whyMatters}</p>
          </div>

          {/* Achievability note */}
          {goal.achievabilityNote && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Catatan Keterjangkauan
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{goal.achievabilityNote}</p>
            </div>
          )}
        </div>

        {/* Milestone progress */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Progress Milestone
            </h2>
            {goal.status === 'ACTIVE' && (
              <Link href={`/dashboard/life-map/${goalId}/update`}>
                <Button size="sm" className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs">
                  Isi Update Milestone
                </Button>
              </Link>
            )}
          </div>

          <MilestoneRow
            submittedMilestones={goal.updates.map((u) => ({
              milestone: u.milestone,
              progressPercent: u.progressPercent,
              isLate: u.isLate,
            }))}
            className="mb-4"
          />

          {/* Update details */}
          {goal.updates.length > 0 && (
            <div className="space-y-3">
              {goal.updates.map((update) => (
                <div
                  key={update.id}
                  className="p-3 bg-sky-50 dark:bg-sky-900/10 rounded-xl border border-sky-100 dark:border-sky-900"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-sky-700 dark:text-sky-400">
                      {update.milestone}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{update.progressPercent}%</span>
                      {update.isLate && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">(terlambat)</span>
                      )}
                      {new Date(update.editableUntil) > new Date() && (
                        <Link href={`/dashboard/life-map/${goalId}/update?milestone=${update.milestone}`}>
                          <Button size="sm" variant="outline" className="h-6 text-xs rounded-lg px-2">
                            Edit
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
                    {update.progressText}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(update.recordedAt), 'd MMM yyyy · HH:mm', { locale: localeId })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {goal.updates.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Belum ada update milestone. Isi progress pertamamu!
            </p>
          )}
        </div>

        {/* Back link */}
        <Link href="/dashboard/life-map">
          <Button variant="outline" className="rounded-xl gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            Kembali ke Life Map
          </Button>
        </Link>
      </div>
    </div>
  );
}
