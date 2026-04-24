'use client';

/**
 * src/app/(DashboardLayout)/dashboard/pembina/page.tsx
 * NAWASENA M13 — Pembina Dashboard.
 *
 * Widgets: Kirkpatrick compact, compliance, escalations (severity CRITICAL).
 */

import { useEffect, useState } from 'react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { KirkpatrickSnapshot } from '@/components/dashboard/widgets/KirkpatrickSnapshot';
import { ComplianceIndicator } from '@/components/dashboard/widgets/ComplianceIndicator';
import { AlertsPanel } from '@/components/dashboard/widgets/AlertsPanel';
import { WidgetErrorBoundary } from '@/components/dashboard/widgets/WidgetErrorBoundary';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import type { PembinaDashboardPayload } from '@/types/dashboard';
import { GraduationCap, Bell } from 'lucide-react';

const log = createLogger('m13/dashboard/pembina');

export default function PembinaDashboardPage() {
  const [payload, setPayload] = useState<PembinaDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        log.info('Fetching Pembina dashboard payload');
        const res = await fetch('/api/dashboard/pembina');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setPayload(json.data);
      } catch (err) {
        log.error('Failed to fetch Pembina dashboard', { err });
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
            <h1 className="text-xl font-bold mt-2">Dashboard Pembina</h1>
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

  const alertsState =
    payload.criticalAlerts.length > 0
      ? { status: 'data' as const, data: payload.criticalAlerts }
      : { status: 'empty' as const };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dashboard Pembina</h1>
              <p className="text-sm text-white/80">Dosen Pembina — Pengawasan Program</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Kirkpatrick Snapshot */}
        <WidgetErrorBoundary widgetName="Evaluasi Kirkpatrick">
          <KirkpatrickSnapshot
            state={{ status: 'data', data: payload.kirkpatrick }}
          />
        </WidgetErrorBoundary>

        {/* Critical Alerts */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-sky-50 dark:border-sky-900/50 flex items-center gap-2">
            <Bell className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Eskalasi Kritis
            </h2>
            {payload.criticalAlerts.length > 0 && (
              <span className="ml-auto text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                {payload.criticalAlerts.length}
              </span>
            )}
          </div>
          <div className="p-4">
            <WidgetErrorBoundary widgetName="Critical Alerts Panel">
              <AlertsPanel state={alertsState} />
            </WidgetErrorBoundary>
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
