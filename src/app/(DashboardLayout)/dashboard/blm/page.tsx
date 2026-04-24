'use client';

/**
 * src/app/(DashboardLayout)/dashboard/blm/page.tsx
 * NAWASENA M13 — BLM Dashboard.
 *
 * Widgets: anon-report triage queue, severity breakdown, compliance indicator.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ComplianceIndicator } from '@/components/dashboard/widgets/ComplianceIndicator';
import { KPIMini } from '@/components/dashboard/widgets/KPIMini';
import { WidgetErrorBoundary } from '@/components/dashboard/widgets/WidgetErrorBoundary';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import type { BLMDashboardPayload } from '@/types/dashboard';
import { Shield, AlertTriangle, ChevronRight, FileText } from 'lucide-react';

const log = createLogger('m13/dashboard/blm');

export default function BLMDashboardPage() {
  const [payload, setPayload] = useState<BLMDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        log.info('Fetching BLM dashboard payload');
        const res = await fetch('/api/dashboard/blm');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setPayload(json.data);
      } catch (err) {
        log.error('Failed to fetch BLM dashboard', { err });
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
            <h1 className="text-xl font-bold mt-2">Dashboard BLM</h1>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!payload) return null;

  const queueKpiState = {
    status: 'data' as const,
    data: {
      kpiDefId: 'blm-anon-queue',
      label: 'Laporan Anonim Antrian',
      value: payload.anonReportQueue,
      target: 0,
      unit: 'laporan',
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
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dashboard BLM</h1>
              <p className="text-sm text-white/80">Badan Legislatif Mahasiswa — Pengawasan &amp; Kepatuhan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Anon Report Queue */}
        <WidgetErrorBoundary widgetName="Laporan Anonim">
          <KPIMini
            state={queueKpiState}
            drillDownUrl="/dashboard/blm/anon-reports"
          />
        </WidgetErrorBoundary>

        {/* Severity Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-sky-50 dark:border-sky-900/50 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Laporan Anonim per Tingkat Keparahan
            </h2>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {payload.anonBySeverity.critical}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Kritis</p>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {payload.anonBySeverity.high}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tinggi</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {payload.anonBySeverity.medium}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sedang</p>
            </div>
          </div>
          <div className="px-5 pb-4">
            <Link
              href="/dashboard/blm/anon-reports"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <FileText className="h-4 w-4" />
              Tinjau Semua Laporan <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Compliance Indicator */}
        <WidgetErrorBoundary widgetName="Kepatuhan Permen 55">
          <ComplianceIndicator state={{ status: 'data', data: payload.compliance }} />
        </WidgetErrorBoundary>
      </div>
    </div>
  );
}
