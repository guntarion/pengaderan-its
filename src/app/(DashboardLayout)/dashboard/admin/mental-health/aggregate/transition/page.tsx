'use client';

/**
 * src/app/(DashboardLayout)/dashboard/admin/mental-health/aggregate/transition/page.tsx
 * NAWASENA M11 — F1→F4 transition admin page.
 */

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { TransitionChart, type TransitionRow } from '@/components/mental-health/TransitionChart';
import { toast } from '@/lib/toast';
import { BarChart3, RefreshCw } from 'lucide-react';

interface TransitionApiResponse {
  success: boolean;
  data: TransitionRow[];
}

export default function MHTransitionPage() {
  const [cohortId, setCohortId] = useState('');
  const [rows, setRows] = useState<TransitionRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransition = useCallback(async () => {
    if (!cohortId) {
      toast.error('Masukkan ID kohort terlebih dahulu');
      return;
    }

    setIsLoading(true);
    setRows(null);
    try {
      const res = await fetch(
        `/api/mental-health/aggregate/transition?cohortId=${encodeURIComponent(cohortId)}`,
      );
      const json = (await res.json()) as TransitionApiResponse;

      if (!res.ok || !json.success) {
        toast.apiError(json);
        return;
      }

      setRows(json.data);
      toast.success(`Data transisi dimuat: ${json.data.length} sel`);
    } catch {
      toast.error('Gagal memuat data transisi');
    } finally {
      setIsLoading(false);
    }
  }, [cohortId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/admin/mental-health/aggregate" className="text-white/80 hover:text-white text-sm">&larr;</Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <h1 className="text-xl font-bold">Transisi F1 → F4</h1>
            </div>
          </div>
          <p className="text-sm text-white/80">
            Perubahan severity dari awal ke akhir angkatan. Data agregat anonim.
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto max-w-4xl px-4 pt-4">
        <DynamicBreadcrumb
          labels={{
            admin: 'Admin',
            'mental-health': 'Kesehatan Mental',
            aggregate: 'Agregat',
            transition: 'Transisi F1→F4',
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-4xl px-4 py-6 flex flex-col gap-6">
        {/* Privacy note */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-2xl">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Catatan Privasi:</strong> Data ini menunjukkan perubahan kondisi kelompok secara agregat,
            bukan individu. Sel &lt; 5 disamarkan. Akses ini dicatat dalam audit log.
          </p>
        </div>

        {/* Filter panel */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Filter Data</h2>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                ID Kohort
              </label>
              <input
                type="text"
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                placeholder="e.g. clh123..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchTransition}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isLoading ? 'Memuat...' : 'Muat Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Transition chart */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
            Matriks Transisi Severity
          </h2>
          {isLoading ? (
            <SkeletonCard />
          ) : rows ? (
            <TransitionChart rows={rows} />
          ) : (
            <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
              Masukkan ID kohort dan klik &ldquo;Muat Data&rdquo; untuk melihat matriks transisi.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
