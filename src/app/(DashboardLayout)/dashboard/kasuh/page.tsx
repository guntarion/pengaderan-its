'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kasuh/page.tsx
 * NAWASENA M09 — Kasuh dashboard: adik asuh list with pulse trend + cycle status.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { CycleStatusBadge, type CycleStatus } from '@/components/m09/CycleStatusBadge';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Heart, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const log = createLogger('kasuh-dashboard-page');

interface PulseCheck {
  date: string;
  mood: number;
  emoji: string;
}

interface PulseTrendData {
  pulseChecks: PulseCheck[];
  avgMood: number | null;
}

interface MabaInfo {
  id: string;
  fullName: string;
  displayName?: string | null;
  image?: string | null;
  nrp?: string | null;
}

interface AdikAsuhItem {
  pair: { id: string; mabaUserId: string; status: string; createdAt: string };
  maba: MabaInfo;
  cycleNumber: number;
  cycleDueDate: string;
  cycleStatus: 'on-track' | 'due' | 'overdue';
  latestLog: { cycleNumber: number; submittedAt: string; attendance: string } | null;
  pulseTrend: PulseTrendData | null;
}

function mapCycleStatus(
  apiStatus: 'on-track' | 'due' | 'overdue',
  latestLog: AdikAsuhItem['latestLog'],
  cycleNumber: number,
): CycleStatus {
  if (latestLog && latestLog.cycleNumber === cycleNumber) return 'SUBMITTED';
  if (apiStatus === 'overdue') return 'OVERDUE';
  if (apiStatus === 'due') return 'DUE';
  return 'UPCOMING';
}

function MiniTrend({ trend }: { trend: PulseTrendData | null }) {
  if (!trend || trend.pulseChecks.length === 0) {
    return <p className="text-xs text-gray-400">Belum ada data pulse</p>;
  }

  const checks = trend.pulseChecks;
  const latest = checks[checks.length - 1]?.mood ?? 0;
  const prev = checks[checks.length - 2]?.mood;
  const diff = prev !== undefined ? latest - prev : 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-semibold text-gray-700 dark:text-gray-300">{latest}/5</span>
      {diff > 0.1 && <TrendingUp className="h-3 w-3 text-emerald-500" />}
      {diff < -0.1 && <TrendingDown className="h-3 w-3 text-red-500" />}
      {Math.abs(diff) <= 0.1 && prev !== undefined && (
        <Minus className="h-3 w-3 text-gray-400" />
      )}
      <span className="text-gray-400">avg: {trend.avgMood?.toFixed(1) ?? '-'}</span>
    </div>
  );
}

export default function KasuhDashboardPage() {
  const [adikList, setAdikList] = useState<AdikAsuhItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        log.info('Fetching Kasuh dashboard data');
        const res = await fetch('/api/kasuh/adik-asuh/list');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setAdikList(json.data ?? []);
      } catch (err) {
        log.error('Failed to fetch Kasuh dashboard', { err });
        toast.error('Gagal memuat data adik asuh');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <DynamicBreadcrumb />
            <h1 className="text-xl font-bold mt-2">Adik Asuh Saya</h1>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Adik Asuh Saya</h1>
              <p className="text-sm text-white/80">MABA yang kamu dampingi — logbook & pulse</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {adikList.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-12 text-center shadow-sm">
            <Heart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Belum ada adik asuh
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Kamu belum ditugaskan untuk mendampingi MABA manapun.
            </p>
          </div>
        ) : (
          adikList.map((item) => {
            const displayName = item.maba?.displayName ?? item.maba?.fullName ?? 'Unknown';
            const initial = displayName.charAt(0).toUpperCase();
            const cycleStatus = mapCycleStatus(
              item.cycleStatus,
              item.latestLog,
              item.cycleNumber,
            );

            return (
              <div
                key={item.pair.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden"
              >
                <div className="p-4 bg-gradient-to-r from-sky-500 to-blue-600">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {initial}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{displayName}</p>
                      <p className="text-xs text-white/70">Adik Asuhmu</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Pulse trend */}
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Pulse Terakhir</p>
                    <MiniTrend trend={item.pulseTrend} />
                  </div>

                  {/* Cycle status */}
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1.5">
                      Log Siklus ke-{item.cycleNumber}
                    </p>
                    <CycleStatusBadge status={cycleStatus} />
                  </div>

                  {/* Action */}
                  <Link
                    href={`/dashboard/kasuh/adik/${item.pair.mabaUserId}/logbook?pairId=${item.pair.id}`}
                    className="flex items-center justify-between w-full px-3 py-2 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded-xl text-sm font-medium text-sky-700 dark:text-sky-400 transition-colors"
                  >
                    <span>Buka Logbook</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
