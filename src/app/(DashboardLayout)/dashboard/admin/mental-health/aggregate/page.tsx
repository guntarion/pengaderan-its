'use client';

/**
 * src/app/(DashboardLayout)/dashboard/admin/mental-health/aggregate/page.tsx
 * NAWASENA M11 — Admin MH aggregate view page.
 *
 * Shows severity distribution per KP group.
 * Cell-floor masking (< 5) applied server-side.
 * CSV export available.
 *
 * PRIVACY-CRITICAL:
 *   - No individual user data visible.
 *   - Masked cells shown as "< 5" in chart and CSV.
 *   - Every view is audited server-side via EXPORT_AGGREGATE action.
 */

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { AggregateChart, type AggregateRow } from '@/components/mental-health/AggregateChart';
import { toast } from '@/lib/toast';
import { BarChart3, Download, RefreshCw } from 'lucide-react';

type Phase = 'F1' | 'F4';

interface AggregateApiResponse {
  success: boolean;
  data: AggregateRow[];
}

export default function MHAggregatePage() {
  const [cohortId, setCohortId] = useState('');
  const [phase, setPhase] = useState<Phase>('F1');
  const [rows, setRows] = useState<AggregateRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAggregate = useCallback(async () => {
    if (!cohortId) {
      toast.error('Masukkan ID kohort terlebih dahulu');
      return;
    }

    setIsLoading(true);
    setRows(null);
    try {
      const res = await fetch(
        `/api/mental-health/aggregate?cohortId=${encodeURIComponent(cohortId)}&phase=${phase}`,
      );
      const json = (await res.json()) as AggregateApiResponse;

      if (!res.ok || !json.success) {
        toast.apiError(json);
        return;
      }

      setRows(json.data);
      toast.success(`Data agregat dimuat: ${json.data.length} sel`);
    } catch {
      toast.error('Gagal memuat data agregat');
    } finally {
      setIsLoading(false);
    }
  }, [cohortId, phase]);

  function handleExportCSV() {
    if (!cohortId) {
      toast.error('Masukkan ID kohort terlebih dahulu');
      return;
    }
    const url = `/api/mental-health/aggregate/export?cohortId=${encodeURIComponent(cohortId)}&phase=${phase}`;
    window.location.href = url;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard" className="text-white/80 hover:text-white text-sm">&larr;</Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <h1 className="text-xl font-bold">Agregat Kesehatan Mental</h1>
            </div>
          </div>
          <p className="text-sm text-white/80">
            Data distribusi anonim per kelompok KP. Sel &lt; 5 orang disamarkan.
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
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-4xl px-4 py-6 flex flex-col gap-6">
        {/* Privacy note */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-2xl">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Catatan Privasi:</strong> Halaman ini hanya menampilkan data agregat anonim. Tidak ada data
            individual yang dapat diidentifikasi. Setiap akses ke halaman ini dicatat dalam audit log.
            Data dengan &lt; 5 peserta ditampilkan sebagai &ldquo;&lt;5&rdquo;.
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
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Fase
              </label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as Phase)}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="F1">F1 (Awal Angkatan)</option>
                <option value="F4">F4 (Akhir Angkatan)</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchAggregate}
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
              {rows && (
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
              Distribusi Severity per Kelompok KP
            </h2>
            {rows && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {rows.filter((r) => !r.masked).length} sel terbuka ·{' '}
                {rows.filter((r) => r.masked).length} sel disamarkan
              </span>
            )}
          </div>

          {isLoading ? (
            <SkeletonCard />
          ) : rows ? (
            <AggregateChart rows={rows} />
          ) : (
            <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
              Masukkan ID kohort dan klik &ldquo;Muat Data&rdquo; untuk melihat distribusi.
            </div>
          )}
        </div>

        {/* Link to transition */}
        <Link
          href="/dashboard/admin/mental-health/aggregate/transition"
          className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:shadow-sm transition-shadow"
        >
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Transisi F1 → F4</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Lihat perubahan severity dari awal ke akhir angkatan
            </p>
          </div>
          <span className="text-sm text-sky-600 dark:text-sky-400">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
