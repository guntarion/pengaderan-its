'use client';

/**
 * src/app/(DashboardLayout)/dashboard/satgas/page.tsx
 * NAWASENA M13 — SATGAS Dashboard.
 *
 * Widgets: severe incidents, anon reports (count + tracking code — no body), program stats.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { KPIMini } from '@/components/dashboard/widgets/KPIMini';
import { WidgetErrorBoundary } from '@/components/dashboard/widgets/WidgetErrorBoundary';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import type { SatgasDashboardPayload } from '@/types/dashboard';
import {
  ShieldAlert,
  Users,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Activity,
} from 'lucide-react';

const log = createLogger('m13/dashboard/satgas');

export default function SatgasDashboardPage() {
  const [payload, setPayload] = useState<SatgasDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        log.info('Fetching SATGAS dashboard payload');
        const res = await fetch('/api/dashboard/satgas');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setPayload(json.data);
      } catch (err) {
        log.error('Failed to fetch SATGAS dashboard', { err });
        toast.error('Gagal memuat dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />
            <h1 className="text-xl font-bold mt-2">Dashboard SATGAS</h1>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!payload) return null;

  const incidentKpiState = {
    status: 'data' as const,
    data: {
      kpiDefId: 'satgas-severe-incidents',
      label: 'Insiden Berat Aktif',
      value: payload.severeIncidents,
      target: 0,
      unit: 'insiden',
      period: 'now',
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dashboard SATGAS</h1>
              <p className="text-sm text-white/80">Satuan Tugas — Insiden &amp; Safeguard</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Severe Incidents */}
        <WidgetErrorBoundary widgetName="Insiden Berat">
          <KPIMini
            state={incidentKpiState}
            drillDownUrl="/dashboard/satgas/escalated-reports"
          />
        </WidgetErrorBoundary>

        {/* Anon Report Count (count only — no body per privacy rule) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-sky-50 dark:border-sky-900/50 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Laporan Anonim (Jumlah)
            </h2>
            <span className="ml-auto text-xs text-gray-400">Hanya jumlah — tanpa isi</span>
          </div>
          <div className="p-4 flex gap-4">
            <div className="flex-1 text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                {payload.anonReportCount}
              </p>
              <p className="text-xs text-gray-400 mt-1">Total</p>
            </div>
            <div className="flex-1 text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {payload.anonReportBySeverity.critical}
              </p>
              <p className="text-xs text-gray-400 mt-1">Kritis</p>
            </div>
            <div className="flex-1 text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {payload.anonReportBySeverity.high}
              </p>
              <p className="text-xs text-gray-400 mt-1">Tinggi</p>
            </div>
          </div>
        </div>

        {/* Program Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-sky-50 dark:border-sky-900/50 flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Statistik Program
            </h2>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl">
              <div className="flex items-center justify-center mb-1">
                <Users className="h-4 w-4 text-sky-500" />
              </div>
              <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                {payload.programStats.totalMaba}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total MABA</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <div className="flex items-center justify-center mb-1">
                <Users className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {payload.programStats.activeMaba}
              </p>
              <p className="text-xs text-gray-500 mt-1">MABA Aktif</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex items-center justify-center mb-1">
                <CheckCircle className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {payload.programStats.completedKegiatanCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Kegiatan Selesai</p>
            </div>
          </div>
          <div className="px-5 pb-4">
            <Link
              href="/dashboard/satgas/escalated-reports"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Laporan Eskalasi <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
