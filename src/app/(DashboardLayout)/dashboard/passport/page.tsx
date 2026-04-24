'use client';

/**
 * src/app/(DashboardLayout)/dashboard/passport/page.tsx
 * NAWASENA M05 — Passport Digital dashboard for Maba.
 *
 * Shows overall progress + dimension grid. Filter by dimensi via query param.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { ProgressOverviewCard } from '@/components/passport/ProgressOverviewCard';
import { StackedBarPerDimension } from '@/components/passport/StackedBarPerDimension';
import { DimensionCardGrid } from '@/components/passport/DimensionCardGrid';
import { DimensionDetailList, type PassportItemRow } from '@/components/passport/DimensionDetailList';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import type { ProgressSummary } from '@/lib/passport/progress.service';

const DIMENSION_LABELS: Record<string, string> = {
  D1_ORANG: 'Dimensi Orang',
  D2_FASILITAS: 'Dimensi Fasilitas',
  D3_BIDANG_PEMBELAJARAN: 'Bidang Pembelajaran',
  D4_KARIR: 'Dimensi Karir',
  D5_KEMAHASISWAAN: 'Kemahasiswaan',
  D6_AKADEMIK: 'Dimensi Akademik',
  D7_KEKOMPAKAN: 'Kekompakan',
  D8_LOYALITAS: 'Loyalitas',
  D9_MENTAL_POSITIF: 'Mental Positif',
  D10_KEPEDULIAN_SOSIAL: 'Kepedulian Sosial',
  D11_KEINSINYURAN: 'Keinsinyuran',
};

export default function PassportPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const activeDimensi = searchParams.get('dimensi');

  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [items, setItems] = useState<PassportItemRow[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Load progress
  useEffect(() => {
    if (!session) return;
    async function fetchProgress() {
      setIsLoadingProgress(true);
      try {
        const res = await fetch('/api/passport/progress');
        if (res.ok) {
          const { data } = await res.json();
          setProgress(data);
        }
      } catch {
        // Silent — user sees empty state
      } finally {
        setIsLoadingProgress(false);
      }
    }
    fetchProgress();
  }, [session]);

  // Load items for active dimension
  useEffect(() => {
    if (!activeDimensi || !session) return;
    async function fetchItems() {
      setIsLoadingItems(true);
      try {
        const res = await fetch(`/api/passport/items?dimensi=${activeDimensi}`);
        if (res.ok) {
          const { data } = await res.json();
          setItems(data ?? []);
        }
      } catch {
        // Silent
      } finally {
        setIsLoadingItems(false);
      }
    }
    fetchItems();
  }, [activeDimensi, session]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="text-white/80 hover:text-white text-sm">
              &larr; Dashboard
            </Link>
          </div>
          <h1 className="text-xl font-bold">Passport Digital</h1>
          <p className="text-sm text-sky-100 mt-1">
            Rekam jejak pengalaman dan kompetensimu selama masa MABA.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-5">
        <DynamicBreadcrumb />

        {/* Progress overview */}
        <ErrorBoundary>
          {isLoadingProgress ? (
            <SkeletonCard />
          ) : progress ? (
            <ProgressOverviewCard progress={progress} />
          ) : null}
        </ErrorBoundary>

        {/* Stacked bar */}
        {progress && !isLoadingProgress && (
          <ErrorBoundary>
            <StackedBarPerDimension progress={progress} />
          </ErrorBoundary>
        )}

        {/* Dimension detail (filtered) */}
        {activeDimensi && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                {DIMENSION_LABELS[activeDimensi] ?? activeDimensi}
              </h2>
              <Link
                href="/dashboard/passport"
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
              >
                Lihat semua dimensi
              </Link>
            </div>
            {isLoadingItems ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <DimensionDetailList
                items={items}
                dimensiLabel={DIMENSION_LABELS[activeDimensi] ?? activeDimensi}
              />
            )}
          </div>
        )}

        {/* Dimension grid */}
        {!activeDimensi && progress && (
          <ErrorBoundary>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
                Semua Dimensi
              </h2>
              <DimensionCardGrid progress={progress} />
            </div>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
