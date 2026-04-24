/**
 * src/components/dashboard/widgets/MoodCard.tsx
 * Mood average card with 7-day sparkline trend.
 * Props-driven — no internal data fetching.
 */

'use client';

import React from 'react';
import { SmileIcon } from 'lucide-react';
import { Sparkline } from '@/components/dashboard/charts/Sparkline';
import { EmptyState } from './EmptyState';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import type { WidgetState } from '@/types/dashboard';

interface MoodTrendData {
  avg: number | null;
  count: number;
  trend7d: number[];
}

interface MoodCardProps {
  state: WidgetState<MoodTrendData>;
  title?: string;
  drillDownUrl?: string;
  className?: string;
}

function getMoodLabel(avg: number | null): string {
  if (avg === null) return '—';
  if (avg >= 4.5) return 'Sangat Baik';
  if (avg >= 3.5) return 'Baik';
  if (avg >= 2.5) return 'Cukup';
  if (avg >= 1.5) return 'Perlu Perhatian';
  return 'Tidak Baik';
}

function getMoodColor(avg: number | null): string {
  if (avg === null) return 'text-gray-400';
  if (avg >= 4) return 'text-emerald-600 dark:text-emerald-400';
  if (avg >= 3) return 'text-sky-600 dark:text-sky-400';
  if (avg >= 2) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function MoodCardInner({ state, title = 'Mood Hari Ini', drillDownUrl, className = '' }: MoodCardProps) {
  if (state.status === 'loading') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (state.status === 'empty') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</p>
        <EmptyState description="Belum ada data mood hari ini" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</p>
        <EmptyState variant="error" description={state.error} />
      </div>
    );
  }

  const data = state.status === 'partial' ? state.data : state.data;
  const avg = data.avg ?? null;

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${
        drillDownUrl ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      } ${className}`}
      onClick={drillDownUrl ? () => window.location.href = drillDownUrl : undefined}
      role={drillDownUrl ? 'button' : undefined}
      tabIndex={drillDownUrl ? 0 : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <SmileIcon className="h-4 w-4 text-sky-400" />
      </div>

      <div className="flex items-end gap-2 mb-3">
        <span className={`text-3xl font-bold ${getMoodColor(avg)}`}>
          {avg !== null ? avg.toFixed(1) : '—'}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">/ 5</span>
      </div>

      <p className={`text-xs font-medium mb-3 ${getMoodColor(avg)}`}>
        {getMoodLabel(avg)}
      </p>

      {data.trend7d && data.trend7d.length > 1 && (
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Tren 7 hari</p>
          <Sparkline data={data.trend7d} color="#0ea5e9" height={36} showTooltip />
        </div>
      )}

      {data.count !== undefined && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {data.count} responden hari ini
        </p>
      )}
    </div>
  );
}

export function MoodCard(props: MoodCardProps) {
  return (
    <WidgetErrorBoundary widgetName="MoodCard">
      <MoodCardInner {...props} />
    </WidgetErrorBoundary>
  );
}
