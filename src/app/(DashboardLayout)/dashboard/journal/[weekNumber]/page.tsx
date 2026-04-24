'use client';

/**
 * src/app/(DashboardLayout)/dashboard/journal/[weekNumber]/page.tsx
 * NAWASENA M04 — View or edit a specific week's journal.
 *
 * If submitted: shows JournalReadView
 * If draft exists: shows JournalEditor pre-filled
 * If nothing: shows JournalEditor empty
 */

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { BookOpen } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { PromptHint } from '@/components/journal/PromptHint';
import { JournalEditor } from '@/components/journal/JournalEditor';
import { JournalReadView } from '@/components/journal/JournalReadView';

interface JournalData {
  id: string;
  weekNumber: number;
  whatHappened: string;
  soWhat: string;
  nowWhat: string;
  status: string;
  wordCount: number;
  submittedAt: string;
  isLate: boolean;
}

interface DraftData {
  id: string;
  weekNumber: number;
  whatHappened: string;
  soWhat: string;
  nowWhat: string;
  wordCount: number;
}

type WeekData =
  | { type: 'submitted'; data: JournalData }
  | { type: 'draft'; data: DraftData }
  | { type: 'none'; data: null };

export default function JournalWeekPage({
  params,
}: {
  params: Promise<{ weekNumber: string }>;
}) {
  const { weekNumber: weekNumberStr } = use(params);
  const weekNumber = parseInt(weekNumberStr, 10);

  const { data: session } = useSession();
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const cohortId = (session?.user as { currentCohortId?: string })?.currentCohortId ?? '';

  useEffect(() => {
    if (!cohortId) {
      setIsLoading(false);
      return;
    }

    async function fetchWeekData() {
      try {
        const res = await fetch(
          `/api/journal/${weekNumber}?cohortId=${encodeURIComponent(cohortId)}`,
        );
        if (res.ok) {
          const { data } = await res.json();
          setWeekData(data ?? { type: 'none', data: null });
        } else {
          setWeekData({ type: 'none', data: null });
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchWeekData();
  }, [cohortId, weekNumber]);

  const isSubmitted = weekData?.type === 'submitted';
  const isDraft = weekData?.type === 'draft';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/journal" className="text-white/80 hover:text-white text-lg">&larr;</Link>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <h1 className="text-xl font-bold">Jurnal Minggu {weekNumber}</h1>
            </div>
          </div>
          <p className="text-white/80 text-sm ml-8">
            {isSubmitted
              ? 'Jurnal sudah dikirim.'
              : 'Tulis refleksimu minggu ini.'}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />

        {isLoading ? (
          <SkeletonCard />
        ) : (
          <ErrorBoundary>
            {/* Submitted: read-only view */}
            {isSubmitted && weekData.data && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
                <JournalReadView
                  journal={{
                    weekNumber,
                    whatHappened: weekData.data.whatHappened,
                    soWhat: weekData.data.soWhat,
                    nowWhat: weekData.data.nowWhat,
                    status: weekData.data.status,
                    wordCount: weekData.data.wordCount,
                    submittedAt: weekData.data.submittedAt,
                  }}
                />
              </div>
            )}

            {/* Draft or empty: editor */}
            {!isSubmitted && (
              <>
                <PromptHint weekNumber={weekNumber} />
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
                  <JournalEditor
                    weekNumber={weekNumber}
                    initialDraft={
                      isDraft && weekData.data
                        ? {
                            whatHappened: weekData.data.whatHappened,
                            soWhat: weekData.data.soWhat,
                            nowWhat: weekData.data.nowWhat,
                          }
                        : undefined
                    }
                  />
                </div>
              </>
            )}
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
