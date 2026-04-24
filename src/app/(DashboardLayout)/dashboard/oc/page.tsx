'use client';

/**
 * src/app/(DashboardLayout)/dashboard/oc/page.tsx
 * NAWASENA M13 — OC (Organizing Committee) Dashboard.
 *
 * Widgets: upcoming events as PIC, pending evaluation count, recent NPS scores.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { EventListCard } from '@/components/dashboard/widgets/EventListCard';
import { KPIMini } from '@/components/dashboard/widgets/KPIMini';
import { WidgetErrorBoundary } from '@/components/dashboard/widgets/WidgetErrorBoundary';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import type { OCDashboardPayload } from '@/types/dashboard';
import type { UpcomingEvent } from '@/components/dashboard/widgets/EventListCard';
import { ClipboardList, BarChart2, ChevronRight, CalendarDays } from 'lucide-react';

const log = createLogger('m13/dashboard/oc');

export default function OCDashboardPage() {
  const [payload, setPayload] = useState<OCDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        log.info('Fetching OC dashboard payload');
        const res = await fetch('/api/dashboard/oc');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setPayload(json.data);
      } catch (err) {
        log.error('Failed to fetch OC dashboard', { err });
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
            <h1 className="text-xl font-bold mt-2">Dashboard OC</h1>
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

  // KPIMini state for evaluation pending count
  const evalKpiState = {
    status: 'data' as const,
    data: {
      kpiDefId: 'oc-eval-pending',
      label: 'Kegiatan Perlu Evaluasi',
      value: payload.evaluationPending,
      target: 0,
      unit: 'kegiatan',
      period: 'now',
    },
  };

  const eventsState: { status: 'data'; data: UpcomingEvent[] } | { status: 'empty' } =
    payload.upcomingEventsAsPIC.length > 0
      ? { status: 'data', data: payload.upcomingEventsAsPIC as UpcomingEvent[] }
      : { status: 'empty' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dashboard OC</h1>
              <p className="text-sm text-white/80">Organizing Committee — Kegiatan &amp; Evaluasi</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Pending Evaluations */}
        <WidgetErrorBoundary widgetName="Evaluasi Pending">
          <KPIMini
            state={evalKpiState}
            drillDownUrl="/dashboard/kegiatan"
          />
        </WidgetErrorBoundary>

        {/* Upcoming Events as PIC */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-sky-50 dark:border-sky-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-sky-500" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Kegiatan Kamu Sebagai PIC
              </h2>
            </div>
            <Link
              href="/dashboard/kegiatan"
              className="text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1"
            >
              Semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-4">
            <WidgetErrorBoundary widgetName="Upcoming Events">
              <EventListCard state={eventsState} />
            </WidgetErrorBoundary>
          </div>
        </div>

        {/* Recent NPS */}
        {payload.recentNPS.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-sky-50 dark:border-sky-900/50 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-sky-500" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                NPS Kegiatan Terakhir
              </h2>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-slate-700">
              {payload.recentNPS.map((nps) => (
                <div key={nps.eventId} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {nps.eventName}
                    </p>
                    <p className="text-xs text-gray-400">{nps.count} responden</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${
                        nps.avgNps >= 8
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : nps.avgNps >= 6
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {nps.avgNps.toFixed(1)}
                    </span>
                    <p className="text-xs text-gray-400">avg NPS</p>
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
