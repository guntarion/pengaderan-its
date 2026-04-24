'use client';

/**
 * src/app/(DashboardLayout)/dashboard/sac/screening-queue/page.tsx
 * NAWASENA M11 — SAC screening queue page.
 *
 * Role guard: SC (isSACCounselor=true)
 * Fetches referrals from /api/mental-health/referrals and renders SACQueueTable.
 *
 * PRIVACY-CRITICAL: No Maba PII displayed on this page.
 */

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { SACQueueTable, type SACReferralItem } from '@/components/mental-health/SACQueueTable';
import { toast } from '@/lib/toast';
import { Users, RefreshCw } from 'lucide-react';

export default function SACScreeningQueuePage() {
  const [referrals, setReferrals] = useState<SACReferralItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/mental-health/referrals');
      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        return;
      }
      const { data } = await res.json();
      setReferrals(data ?? []);
    } catch {
      toast.error('Gagal memuat antrean skrining');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard" className="text-white/80 hover:text-white text-sm">&larr;</Link>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <h1 className="text-xl font-bold">Screening Queue MH</h1>
            </div>
          </div>
          <p className="text-sm text-white/80">
            Antrean referral kesehatan mental yang ditugaskan kepada Anda.
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto max-w-5xl px-4 pt-4">
        <DynamicBreadcrumb
          labels={{
            sac: 'SAC',
            'screening-queue': 'Screening Queue MH',
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-5xl px-4 py-6 flex flex-col gap-6">
        {/* Privacy notice */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-2xl">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Catatan Privasi:</strong> Halaman ini menampilkan referral yang ditugaskan kepada Anda.
            Identitas mahasiswa tidak ditampilkan. Akses ke jawaban skrining memerlukan konfirmasi
            dan akan dicatat dalam audit log.
          </p>
        </div>

        {/* Queue table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
              Referral Aktif
            </h2>
            <button
              onClick={fetchQueue}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <SkeletonCard />
          ) : referrals.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
              Tidak ada referral aktif saat ini.
            </div>
          ) : (
            <SACQueueTable referrals={referrals} />
          )}
        </div>
      </div>
    </div>
  );
}
