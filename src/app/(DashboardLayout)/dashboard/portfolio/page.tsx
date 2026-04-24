'use client';

/**
 * src/app/(DashboardLayout)/dashboard/portfolio/page.tsx
 * NAWASENA M07 — Portfolio page for Maba (self) and Kasuh (for adik asuh).
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { PortfolioView } from '@/components/portfolio/PortfolioView';
import { toast } from '@/lib/toast';
import { SkeletonPageHeader, SkeletonText } from '@/components/shared/skeletons';
import type { PortfolioData } from '@/lib/portfolio/composer';

export default function PortfolioPage() {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId') ?? undefined;

  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    try {
      const params = targetUserId ? `?userId=${targetUserId}` : '';
      const res = await fetch(`/api/portfolio${params}`);
      const json = await res.json();

      if (json.success) {
        setPortfolio(json.data as PortfolioData);
      } else {
        toast.apiError(json);
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    void fetchPortfolio();
  }, [fetchPortfolio]);

  const isEmpty =
    portfolio &&
    portfolio.timeCapsule.totalEntries === 0 &&
    portfolio.lifeMap.totalGoals === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4 print:hidden">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            labels={{ 'portfolio': 'Portfolio' }}
            className="text-white/70 mb-2 text-sm"
          />
          <h1 className="text-xl font-bold">Portfolio</h1>
          <p className="text-sm text-white/80 mt-0.5">
            Rekam jejak perjalananmu selama NAWASENA
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            <SkeletonPageHeader />
            <SkeletonText lines={6} />
          </div>
        ) : isEmpty ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-12 text-center shadow-sm">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Portfolio Masih Kosong
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Mulai tulis Time Capsule dan tetapkan tujuan di Life Map untuk membangun portofolio perjalananmu.
            </p>
          </div>
        ) : portfolio ? (
          <PortfolioView data={portfolio} readonly={!!targetUserId} />
        ) : null}
      </div>
    </div>
  );
}
