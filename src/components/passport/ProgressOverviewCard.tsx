'use client';

/**
 * src/components/passport/ProgressOverviewCard.tsx
 * NAWASENA M05 — Overall passport progress ring + stats.
 */

import type { ProgressSummary } from '@/lib/passport/progress.service';

interface ProgressOverviewCardProps {
  progress: ProgressSummary;
  isLoading?: boolean;
}

export function ProgressOverviewCard({ progress, isLoading }: ProgressOverviewCardProps) {
  const percentage =
    progress.totalItems > 0
      ? Math.round((progress.verified / progress.totalItems) * 100)
      : 0;

  const circumference = 2 * Math.PI * 52; // r=52
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5 animate-pulse">
        <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
      <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Progress Passport</h2>

      <div className="flex items-center gap-6">
        {/* Progress Ring */}
        <div className="relative flex-shrink-0">
          <svg width="120" height="120" className="-rotate-90">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="52"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              className="text-gray-100 dark:text-gray-700"
            />
            {/* Progress arc */}
            <circle
              cx="60"
              cy="60"
              r="52"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-emerald-500 transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {percentage}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">selesai</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          <StatItem
            label="Terverifikasi"
            value={progress.verified}
            total={progress.totalItems}
            color="emerald"
          />
          <StatItem
            label="Menunggu"
            value={progress.pending}
            total={progress.totalItems}
            color="amber"
          />
          <StatItem
            label="Ditolak"
            value={progress.rejected}
            total={progress.totalItems}
            color="red"
          />
          <StatItem
            label="Belum Dimulai"
            value={progress.notStarted}
            total={progress.totalItems}
            color="gray"
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        Total: {progress.totalItems} item · Diperbarui: {new Date(progress.generatedAt).toLocaleTimeString('id-ID')}
      </p>
    </div>
  );
}

function StatItem({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: 'emerald' | 'amber' | 'red' | 'gray';
}) {
  const colorMap = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    gray: 'text-gray-500 dark:text-gray-400',
  };

  return (
    <div>
      <p className={`text-xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
