'use client';

/**
 * src/app/(DashboardLayout)/dashboard/pulse/trend/page.tsx
 * NAWASENA M04 — Pulse mood trend page.
 *
 * Shows line chart of mood over last 7/14/30 days.
 * Also lists individual pulse records.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PulseTrendChart } from '@/components/pulse/PulseTrendChart';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface PulseTrendPoint {
  id: string;
  mood: number;
  emoji: string;
  comment: string | null;
  recordedAt: string;
  localDate: string;
}

interface TrendApiResponse {
  success: boolean;
  data: {
    days: number;
    pulses: PulseTrendPoint[];
  };
}

const MOOD_LABELS: Record<number, string> = {
  1: 'Sangat Sedih',
  2: 'Sedih',
  3: 'Biasa',
  4: 'Senang',
  5: 'Sangat Senang',
};

export default function PulseTrendPage() {
  const [days, setDays] = useState(7);
  const [pulses, setPulses] = useState<PulseTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrend = useCallback(async (d: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/pulse/trend?days=${d}`);
      if (res.ok) {
        const { data } = (await res.json()) as TrendApiResponse;
        setPulses(data.pulses);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrend(days);
  }, [days, fetchTrend]);

  const handleDaysChange = (d: number) => {
    setDays(d);
    fetchTrend(d);
  };

  // Stats
  const avgMood = pulses.length > 0
    ? (pulses.reduce((sum, p) => sum + p.mood, 0) / pulses.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/pulse" className="text-white/80 hover:text-white text-lg">&larr;</Link>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <h1 className="text-xl font-bold">Tren Mood</h1>
            </div>
          </div>
          <p className="text-white/80 text-sm ml-8">
            Grafik perubahan mood kamu dari waktu ke waktu.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />

        {/* Stats summary */}
        {!isLoading && pulses.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{pulses.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Check-in</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{avgMood}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Rata-rata Mood</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{days}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hari Terakhir</p>
            </div>
          </div>
        )}

        {/* Chart card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
          <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-4">
            Grafik Mood
          </h2>
          <ErrorBoundary>
            {isLoading ? (
              <SkeletonCard />
            ) : (
              <PulseTrendChart pulses={pulses} days={days} onDaysChange={handleDaysChange} />
            )}
          </ErrorBoundary>
        </div>

        {/* Pulse list */}
        {!isLoading && pulses.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
            <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-4">
              Riwayat Pulse
            </h2>
            <div className="space-y-3">
              {[...pulses].reverse().map((pulse) => (
                <div
                  key={pulse.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800"
                >
                  <span className="text-2xl">{pulse.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        Mood {pulse.mood}/5 — {MOOD_LABELS[pulse.mood]}
                      </p>
                      <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {format(new Date(pulse.recordedAt), 'dd MMM yyyy', { locale: idLocale })}
                      </p>
                    </div>
                    {pulse.comment && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                        {pulse.comment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
