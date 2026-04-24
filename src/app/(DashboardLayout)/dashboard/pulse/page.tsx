'use client';

/**
 * src/app/(DashboardLayout)/dashboard/pulse/page.tsx
 * NAWASENA M04 — Pulse Harian check-in page.
 *
 * Shows today's check-in status and the submission form.
 * Loads today's existing pulse (if any) server-side via client fetch.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { PulseSubmitForm } from '@/components/pulse/PulseSubmitForm';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { TrendingUp, Heart } from 'lucide-react';

interface TodayPulse {
  id: string;
  mood: number;
  emoji: string;
}

interface PulseApiResponse {
  success: boolean;
  data: {
    submitted: boolean;
    pulse: TodayPulse | null;
  };
}

export default function PulsePage() {
  const { data: session } = useSession();
  const [todayPulse, setTodayPulse] = useState<TodayPulse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get cohortId from session (assumes user.currentCohortId)
  const cohortId = (session?.user as { currentCohortId?: string })?.currentCohortId ?? '';

  useEffect(() => {
    async function fetchToday() {
      if (!session) return;
      try {
        const res = await fetch('/api/pulse');
        if (res.ok) {
          const { data } = (await res.json()) as PulseApiResponse;
          setTodayPulse(data.pulse);
        }
      } catch {
        // Network error — show form anyway (offline mode)
      } finally {
        setIsLoading(false);
      }
    }
    fetchToday();
  }, [session]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-white/80 hover:text-white">&larr;</Link>
              <h1 className="text-xl font-bold">Pulse Harian</h1>
            </div>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <SkeletonCard />
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
            <Link href="/dashboard" className="text-white/80 hover:text-white text-lg">&larr;</Link>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              <h1 className="text-xl font-bold">Pulse Harian</h1>
            </div>
          </div>
          <p className="text-white/80 text-sm ml-8">
            Bagikan perasaanmu hari ini kepada KP-mu.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />

        {/* Main form card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
          <ErrorBoundary>
            {cohortId ? (
              <PulseSubmitForm
                cohortId={cohortId}
                todayPulse={todayPulse}
                onSubmitted={setTodayPulse}
              />
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Kamu belum terdaftar di cohort manapun. Hubungi SC untuk informasi lebih lanjut.
                </p>
              </div>
            )}
          </ErrorBoundary>
        </div>

        {/* Link to trend */}
        <Link
          href="/dashboard/pulse/trend"
          className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-sky-100 dark:border-sky-900 p-5 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="font-medium text-sm text-gray-800 dark:text-gray-200">Tren Mood</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Lihat grafik mood 7/14/30 hari</p>
            </div>
          </div>
          <span className="text-gray-400">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
