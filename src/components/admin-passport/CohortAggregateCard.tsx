'use client';

/**
 * src/components/admin-passport/CohortAggregateCard.tsx
 * NAWASENA M05 — Stacked bar + overall stats for cohort-wide progress.
 */

import { StackedBarPerDimension } from '@/components/passport/StackedBarPerDimension';
import type { ProgressSummary } from '@/lib/passport/progress.service';

interface CohortSummary {
  totalMaba: number;
  completedMaba: number;
  aggregateProgress: ProgressSummary;
}

interface CohortAggregateCardProps {
  summary: CohortSummary;
}

export function CohortAggregateCard({ summary }: CohortAggregateCardProps) {
  const completionPct =
    summary.totalMaba > 0
      ? Math.round((summary.completedMaba / summary.totalMaba) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Mahasiswa"
          value={summary.totalMaba}
          color="sky"
        />
        <StatCard
          label="Selesai 100%"
          value={summary.completedMaba}
          color="emerald"
          sub={`${completionPct}%`}
        />
        <StatCard
          label="Terverifikasi"
          value={summary.aggregateProgress.verified}
          color="emerald"
        />
        <StatCard
          label="Menunggu"
          value={summary.aggregateProgress.pending}
          color="amber"
        />
      </div>

      {/* Stacked bar */}
      <StackedBarPerDimension progress={summary.aggregateProgress} height={260} />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number;
  color: 'sky' | 'emerald' | 'amber' | 'red';
  sub?: string;
}) {
  const colorMap = {
    sky: 'text-sky-600 dark:text-sky-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-4">
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value.toLocaleString('id-ID')}</p>
      {sub && <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{sub}</p>}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}
