'use client';

/**
 * src/app/(DashboardLayout)/dashboard/sc/page.tsx
 * NAWASENA M13 — SC (Steering Committee) Dashboard.
 *
 * Widgets: KirkpatrickSnapshot, mood angkatan trend + polling (60s), AlertsPanel,
 *          ComplianceIndicator, anon count breakdown.
 *
 * Privacy: cell floor ≥5 (enforced in payload builder), no MH individual, no anon body.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { KirkpatrickSnapshot } from '@/components/dashboard/widgets/KirkpatrickSnapshot';
import { MoodCard } from '@/components/dashboard/widgets/MoodCard';
import { AlertsPanel } from '@/components/dashboard/widgets/AlertsPanel';
import { ComplianceIndicator } from '@/components/dashboard/widgets/ComplianceIndicator';
import { WidgetErrorBoundary } from '@/components/dashboard/widgets/WidgetErrorBoundary';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import type { SCDashboardPayload } from '@/types/dashboard';
import { Layers, RefreshCw, Eye, FileText, AlertTriangle } from 'lucide-react';

const log = createLogger('m13/dashboard/sc');
const POLL_INTERVAL_MS = 60_000;

interface LiveMoodData {
  avg: number | null;
  count: number;
  trend7d: number[];
}

export default function SCDashboardPage() {
  const [payload, setPayload] = useState<SCDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveMood, setLiveMood] = useState<LiveMoodData | null>(null);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLiveMood = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/sc/mood-live');
      if (!res.ok) return;
      const json = await res.json();
      setLiveMood(json.data as LiveMoodData);
      setLastPolledAt(new Date());
      log.debug('Live mood polled', { data: json.data });
    } catch (err) {
      log.warn('Live mood poll failed', { err });
    }
  }, []);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        log.info('Fetching SC dashboard payload');
        const res = await fetch('/api/dashboard/sc');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        const data: SCDashboardPayload = json.data;
        setPayload(data);
        // Seed live mood from initial payload
        if (data.moodCohort) {
          setLiveMood(data.moodCohort);
        }
      } catch (err) {
        log.error('Failed to fetch SC dashboard', { err });
        toast.error('Gagal memuat dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  // Start 60s polling after payload is loaded
  useEffect(() => {
    if (!payload) return;
    fetchLiveMood();
    pollRef.current = setInterval(fetchLiveMood, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [payload, fetchLiveMood]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />
            <h1 className="text-xl font-bold mt-2">Dashboard SC</h1>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!payload) return null;

  const moodState = liveMood
    ? { status: 'data' as const, data: liveMood }
    : { status: 'loading' as const };

  const alertsState =
    payload.alerts.length > 0
      ? { status: 'data' as const, data: payload.alerts }
      : { status: 'empty' as const };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dashboard SC</h1>
              <p className="text-sm text-white/80">Steering Committee — Kendali Program</p>
            </div>
            {lastPolledAt && (
              <div className="ml-auto flex items-center gap-1 text-xs text-white/60">
                <RefreshCw className="h-3 w-3" />
                <span>
                  Live:{' '}
                  {lastPolledAt.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Alert count badge */}
        {payload.alerts.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {payload.alerts.length} red flag aktif memerlukan perhatian
            </p>
          </div>
        )}

        {/* Kirkpatrick Snapshot */}
        <WidgetErrorBoundary widgetName="Kirkpatrick">
          <KirkpatrickSnapshot state={{ status: 'data', data: payload.kirkpatrick }} />
        </WidgetErrorBoundary>

        {/* Live Mood (60s polling) */}
        <WidgetErrorBoundary widgetName="Mood Angkatan">
          <MoodCard
            state={moodState}
            title="Mood Angkatan (Live)"
          />
        </WidgetErrorBoundary>

        {/* Anon Report Count Breakdown — count only, k-anonymity floor ≥5 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-sky-50 dark:border-sky-900/50 flex items-center gap-2">
            <Eye className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Laporan Anonim
            </h2>
            <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Hanya jumlah — privasi k≥5
            </span>
          </div>
          <div className="p-4 grid grid-cols-4 gap-2">
            {[
              {
                label: 'Total',
                value: payload.anonReportCount.total,
                color: 'text-gray-700 dark:text-gray-200',
                bg: 'bg-gray-50 dark:bg-slate-700',
              },
              {
                label: 'Kritis',
                value: payload.anonReportCount.critical,
                color: 'text-red-600 dark:text-red-400',
                bg: 'bg-red-50 dark:bg-red-900/20',
              },
              {
                label: 'Tinggi',
                value: payload.anonReportCount.high,
                color: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-50 dark:bg-amber-900/20',
              },
              {
                label: 'Sedang',
                value: payload.anonReportCount.medium,
                color: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-50 dark:bg-blue-900/20',
              },
            ].map((item) => (
              <div key={item.label} className={`text-center p-3 ${item.bg} rounded-xl`}>
                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Active Alerts Panel */}
        <WidgetErrorBoundary widgetName="Red Flag Alerts">
          <AlertsPanel state={alertsState} />
        </WidgetErrorBoundary>

        {/* Compliance Indicator */}
        <WidgetErrorBoundary widgetName="Kepatuhan Permen 55">
          <ComplianceIndicator state={{ status: 'data', data: payload.compliance }} />
        </WidgetErrorBoundary>
      </div>
    </div>
  );
}
