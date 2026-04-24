'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kasuh/adik-asuh/[mabaId]/time-capsule/page.tsx
 * NAWASENA M07 — Kasuh read view: shared Time Capsule entries and Life Map goals.
 *
 * Read-only. No edit/comment buttons.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SharedNoticeBanner } from '@/components/kasuh/SharedNoticeBanner';
import { SharedEntriesFeed } from '@/components/kasuh/SharedEntriesFeed';
import { SharedGoalsFeed } from '@/components/kasuh/SharedGoalsFeed';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { SkeletonCardGrid, SkeletonPageHeader } from '@/components/shared/skeletons';
import { cn } from '@/lib/utils';

type TabType = 'time-capsule' | 'life-map';

interface SharedEntry {
  id: string;
  title: string | null;
  body: string;
  mood: number | null;
  publishedAt: string | null;
  attachments: Array<{ id: string; mimeType: string; originalFilename: string; size: number }>;
}

interface SharedGoal {
  id: string;
  area: string;
  goalText: string;
  metric: string;
  status: string;
  deadline: string;
  updates: Array<{ id: string; milestone: string; progressPercent: number; isLate: boolean; recordedAt: string }>;
}

export default function KasuhSharedViewPage() {
  const { mabaId } = useParams<{ mabaId: string }>();
  const [tab, setTab] = useState<TabType>('time-capsule');
  const [loading, setLoading] = useState(true);
  const [mabaName, setMabaName] = useState('Adik Asuh');
  const [entries, setEntries] = useState<SharedEntry[]>([]);
  const [goals, setGoals] = useState<SharedGoal[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetchData = useCallback(async () => {
    if (!mabaId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        includeLifeMap: 'true',
      });
      const res = await fetch(`/api/kasuh/adik-asuh/${mabaId}/time-capsule?${params}`);
      const json = await res.json();

      if (json.success) {
        setEntries(json.data.entries ?? []);
        setTotal(json.data.total ?? 0);
        setMabaName(json.data.mabaName ?? 'Adik Asuh');
        setGoals(json.data.lifeMapGoals ?? []);
      } else {
        toast.apiError(json);
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [mabaId, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            labels={{
              'kasuh': 'Kasuh',
              'adik-asuh': 'Adik Asuh',
              [mabaId]: mabaName,
              'time-capsule': 'Catatan Bersama',
            }}
            className="text-white/70 mb-2 text-sm"
          />
          <h1 className="text-xl font-bold">Catatan {mabaName}</h1>
          <p className="text-sm text-white/80 mt-0.5">
            Tampilan catatan yang dibagikan oleh adik asuhmu
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Notice banner */}
        <SharedNoticeBanner mabaName={mabaName} />

        {/* Tab switcher */}
        <div className="flex gap-2">
          {(['time-capsule', 'life-map'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                tab === t
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 text-gray-600 dark:text-gray-400 hover:border-sky-300',
              )}
            >
              {t === 'time-capsule' ? `Time Capsule (${total})` : `Life Map (${goals.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <>
            <SkeletonPageHeader />
            <SkeletonCardGrid count={3} />
          </>
        ) : tab === 'time-capsule' ? (
          <>
            <SharedEntriesFeed entries={entries} />
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl"
                >
                  Sebelumnya
                </Button>
                <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl"
                >
                  Selanjutnya
                </Button>
              </div>
            )}
          </>
        ) : (
          <SharedGoalsFeed goals={goals} />
        )}
      </div>
    </div>
  );
}
