'use client';

/**
 * src/app/(DashboardLayout)/dashboard/journal/new/page.tsx
 * NAWASENA M04 — Write new journal for current week.
 *
 * Checks if current week journal already submitted → redirect to view.
 * Otherwise shows JournalEditor for current week.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BookOpen } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { PromptHint } from '@/components/journal/PromptHint';
import { JournalEditor } from '@/components/journal/JournalEditor';

export default function NewJournalPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const cohortId = (session?.user as { currentCohortId?: string })?.currentCohortId ?? '';
  const cohortStartDate = (session?.user as { cohortStartDate?: string })?.cohortStartDate;

  useEffect(() => {
    if (!cohortId || !cohortStartDate) {
      setIsLoading(false);
      return;
    }

    async function checkCurrentWeek() {
      try {
        // Compute current week number client-side using cohort start
        const { getWeekNumber } = await import('@/lib/journal/week-number');
        const week = getWeekNumber(new Date(cohortStartDate!), new Date());
        const safeWeek = Math.max(1, week);

        // Check if already submitted
        const res = await fetch(`/api/journal/${safeWeek}?cohortId=${encodeURIComponent(cohortId)}`);
        if (res.ok) {
          const { data } = await res.json();
          if (data?.type === 'submitted') {
            // Already submitted — redirect to read view
            router.replace(`/dashboard/journal/${safeWeek}`);
            return;
          }
        }

        setCurrentWeek(safeWeek);
      } catch {
        setCurrentWeek(1); // fallback
      } finally {
        setIsLoading(false);
      }
    }

    checkCurrentWeek();
  }, [cohortId, cohortStartDate, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/journal" className="text-white/80 hover:text-white">&larr;</Link>
              <h1 className="text-xl font-bold">Tulis Jurnal</h1>
            </div>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!cohortId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kamu belum terdaftar di cohort. Hubungi SC.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/journal" className="text-white/80 hover:text-white text-lg">&larr;</Link>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <h1 className="text-xl font-bold">
                Jurnal Minggu {currentWeek ?? '—'}
              </h1>
            </div>
          </div>
          <p className="text-white/80 text-sm ml-8">
            Refleksikan pengalamanmu minggu ini. Minimum 300 kata.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />

        {/* Prompt card */}
        {currentWeek && <PromptHint weekNumber={currentWeek} />}

        {/* Editor card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
          <ErrorBoundary>
            {currentWeek && (
              <JournalEditor weekNumber={currentWeek} />
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
