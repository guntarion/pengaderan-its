'use client';

/**
 * src/components/m09/AdikAsuhCard.tsx
 * NAWASENA M09 — Adik Asuh card for Kasuh dashboard.
 *
 * Shows MABA name, pulse trend (last 7 days), and cycle status badge.
 * Links to logbook page.
 */

import Link from 'next/link';
import { CycleStatusBadge, type CycleStatus } from './CycleStatusBadge';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PulseTrend {
  date: string;
  avgScore: number;
}

interface AdikAsuhCardProps {
  pairId: string;
  mabaId: string;
  mabaName: string;
  mabaDisplayName?: string | null;
  cycleStatus: CycleStatus;
  cycleNumber: number;
  daysOverdue?: number;
  dueDate?: string;
  pulseTrend: PulseTrend[];
}

function MiniPulseTrendChart({ trend }: { trend: PulseTrend[] }) {
  if (trend.length === 0) {
    return <p className="text-xs text-gray-400">Belum ada data pulse</p>;
  }

  const max = 5;
  const width = 100;
  const height = 32;

  const points = trend.map((p, i) => ({
    x: (i / Math.max(trend.length - 1, 1)) * width,
    y: height - (p.avgScore / max) * height,
    score: p.avgScore,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const latest = trend[trend.length - 1]?.avgScore ?? 0;
  const prev = trend[trend.length - 2]?.avgScore;
  const diff = prev !== undefined ? latest - prev : 0;

  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-20 h-8 shrink-0"
        aria-label="Grafik pulse trend"
      >
        <path d={pathD} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="#0ea5e9" />
        ))}
      </svg>
      <div className="flex items-center gap-1 text-xs">
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {latest.toFixed(1)}/5
        </span>
        {diff > 0.1 && <TrendingUp className="h-3 w-3 text-emerald-500" />}
        {diff < -0.1 && <TrendingDown className="h-3 w-3 text-red-500" />}
        {Math.abs(diff) <= 0.1 && prev !== undefined && (
          <Minus className="h-3 w-3 text-gray-400" />
        )}
      </div>
    </div>
  );
}

export function AdikAsuhCard({
  pairId,
  mabaId,
  mabaName,
  mabaDisplayName,
  cycleStatus,
  cycleNumber,
  daysOverdue,
  dueDate,
  pulseTrend,
}: AdikAsuhCardProps) {
  const displayName = mabaDisplayName ?? mabaName;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
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
          <p className="text-xs font-medium text-gray-400 mb-1.5">Pulse 7 Hari Terakhir</p>
          <MiniPulseTrendChart trend={pulseTrend} />
        </div>

        {/* Cycle status */}
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1.5">
            Log Siklus ke-{cycleNumber}
          </p>
          <CycleStatusBadge
            status={cycleStatus}
            daysOverdue={daysOverdue}
            dueDate={dueDate}
          />
        </div>

        {/* Action */}
        <Link
          href={`/dashboard/kasuh/adik/${mabaId}/logbook?pairId=${pairId}`}
          className="flex items-center justify-between w-full px-3 py-2 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded-xl text-sm font-medium text-sky-700 dark:text-sky-400 transition-colors"
        >
          <span>Buka Logbook</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
