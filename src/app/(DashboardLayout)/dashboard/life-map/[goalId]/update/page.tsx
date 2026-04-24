'use client';

/**
 * src/app/(DashboardLayout)/dashboard/life-map/[goalId]/update/page.tsx
 * NAWASENA M07 — Milestone update page with M1/M2/M3 tabs and diff view.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { MilestoneUpdateForm, type MilestoneUpdateFormValues } from '@/components/life-map/MilestoneUpdateForm';
import { MilestoneDiffView } from '@/components/life-map/MilestoneDiffView';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { SkeletonPageHeader, SkeletonText } from '@/components/shared/skeletons';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';

type MilestoneKey = 'M1' | 'M2' | 'M3';

interface GoalBrief {
  id: string;
  goalText: string;
  area: string;
  status: string;
}

interface MilestoneUpdate {
  id: string;
  milestone: MilestoneKey;
  progressText: string;
  progressPercent: number;
  reflectionText: string;
  isLate: boolean;
  recordedAt: string;
  editableUntil: string;
  newStatus?: string | null;
}

const MILESTONES: MilestoneKey[] = ['M1', 'M2', 'M3'];

const MILESTONE_LABELS: Record<MilestoneKey, string> = {
  M1: 'M1 — Awal F2',
  M2: 'M2 — Tengah F2',
  M3: 'M3 — Akhir F2',
};

export default function MilestoneUpdatePage() {
  const { goalId } = useParams<{ goalId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const defaultMilestone = (searchParams.get('milestone') as MilestoneKey) ?? 'M1';
  const [activeTab, setActiveTab] = useState<MilestoneKey>(defaultMilestone);

  const [goal, setGoal] = useState<GoalBrief | null>(null);
  const [updates, setUpdates] = useState<MilestoneUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDiff, setShowDiff] = useState(false);

  const fetchData = useCallback(async () => {
    if (!goalId) return;
    try {
      const [goalRes, updatesRes] = await Promise.all([
        fetch(`/api/life-map/${goalId}`),
        fetch(`/api/life-map/${goalId}/update`),
      ]);
      const goalJson = await goalRes.json();
      const updatesJson = await updatesRes.json();

      if (goalJson.success) setGoal(goalJson.data as GoalBrief);
      if (updatesJson.success) setUpdates(updatesJson.data as MilestoneUpdate[]);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSubmit = useCallback(
    async (values: MilestoneUpdateFormValues) => {
      const existing = updates.find((u) => u.milestone === activeTab);

      if (existing && new Date(existing.editableUntil) > new Date()) {
        // Edit existing
        const res = await fetch(`/api/life-map/${goalId}/update/${activeTab}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            progressText: values.progressText,
            progressPercent: values.progressPercent,
            reflectionText: values.reflectionText,
            newStatus: values.newStatus || undefined,
          }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success('Update berhasil diperbarui!');
          await fetchData();
        } else {
          throw json;
        }
      } else {
        // Submit new
        const res = await fetch(`/api/life-map/${goalId}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            milestone: activeTab,
            progressText: values.progressText,
            progressPercent: values.progressPercent,
            reflectionText: values.reflectionText,
            newStatus: values.newStatus || undefined,
          }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success('Update berhasil dikirim!');
          await fetchData();
          router.push(`/dashboard/life-map/${goalId}`);
        } else {
          throw json;
        }
      }
    },
    [activeTab, goalId, updates, fetchData, router],
  );

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

  const activeUpdate = updates.find((u) => u.milestone === activeTab);
  const canEdit = activeUpdate
    ? new Date(activeUpdate.editableUntil) > new Date()
    : false;
  const isAlreadySubmitted = !!activeUpdate;

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
              [goalId]: 'Goal',
              'update': 'Update Milestone',
            }}
            className="text-white/70 mb-2 text-sm"
          />
          <h1 className="text-xl font-bold">Update Milestone</h1>
          {goal && (
            <p className="text-sm text-white/80 mt-0.5 line-clamp-1">{goal.goalText}</p>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Milestone tabs */}
        <div className="flex gap-2">
          {MILESTONES.map((mk) => {
            const submitted = updates.some((u) => u.milestone === mk);
            return (
              <button
                key={mk}
                onClick={() => setActiveTab(mk)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                  activeTab === mk
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 text-gray-600 dark:text-gray-400 hover:border-sky-300',
                )}
              >
                {MILESTONE_LABELS[mk]}
                {submitted && <span className="ml-1">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Overdue warning banner */}
        {isAlreadySubmitted && !canEdit && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
            Update {activeTab} sudah dikunci — batas 7 hari edit sudah berakhir.
          </div>
        )}

        {/* Form or locked state */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          {isAlreadySubmitted && !canEdit ? (
            // Read-only view
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Progres</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{activeUpdate!.progressText}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Refleksi</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{activeUpdate!.reflectionText}</p>
              </div>
              <p className="text-xs text-gray-400">{activeUpdate!.progressPercent}% tercapai</p>
            </div>
          ) : (
            <MilestoneUpdateForm
              milestone={activeTab}
              isEdit={isAlreadySubmitted && canEdit}
              initialValues={
                activeUpdate
                  ? {
                      progressText: activeUpdate.progressText,
                      progressPercent: activeUpdate.progressPercent,
                      reflectionText: activeUpdate.reflectionText,
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
              onCancel={() => router.push(`/dashboard/life-map/${goalId}`)}
            />
          )}
        </div>

        {/* Diff view toggle */}
        {updates.length > 0 && (
          <div>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
            >
              {showDiff ? 'Sembunyikan perbandingan' : 'Lihat perbandingan M1/M2/M3'}
            </button>
            {showDiff && (
              <div className="mt-3">
                <MilestoneDiffView updates={updates} />
              </div>
            )}
          </div>
        )}

        {/* Back link */}
        <Link href={`/dashboard/life-map/${goalId}`}>
          <Button variant="outline" className="rounded-xl gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            Kembali ke Detail Goal
          </Button>
        </Link>
      </div>
    </div>
  );
}
