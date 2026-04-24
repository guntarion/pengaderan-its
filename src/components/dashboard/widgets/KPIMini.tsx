/**
 * src/components/dashboard/widgets/KPIMini.tsx
 * Single KPI metric card with progress indicator.
 */

'use client';

import React from 'react';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from 'lucide-react';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { PartialDataBadge } from './PartialDataBadge';
import type { WidgetState, KPIMiniData } from '@/types/dashboard';
import { useRouter } from 'next/navigation';

interface KPIMiniProps {
  state: WidgetState<KPIMiniData>;
  drillDownUrl?: string;
  className?: string;
}

function getTrendIcon(trend30d?: number[]) {
  if (!trend30d || trend30d.length < 2) return null;
  const delta = trend30d[trend30d.length - 1] - trend30d[0];
  if (Math.abs(delta) < 0.05) return <MinusIcon className="h-3 w-3 text-gray-400" />;
  if (delta > 0) return <TrendingUpIcon className="h-3 w-3 text-emerald-500" />;
  return <TrendingDownIcon className="h-3 w-3 text-red-500" />;
}

function getProgressColor(value: number, target: number): string {
  const pct = (value / target) * 100;
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

function KPIMiniInner({ state, drillDownUrl, className = '' }: KPIMiniProps) {
  const router = useRouter();

  if (state.status === 'loading') {
    return (
      <div className={`rounded-xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-4 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (state.status === 'error' || state.status === 'empty') {
    return (
      <div className={`rounded-xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-4 ${className}`}>
        <p className="text-xs text-gray-400">—</p>
      </div>
    );
  }

  const data = state.status === 'data' ? state.data : state.data as KPIMiniData;
  const progressPct = data.value !== null && data.target ? Math.min((data.value / data.target) * 100, 100) : null;

  return (
    <div
      className={`rounded-xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-4 ${
        drillDownUrl ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''
      } ${className}`}
      onClick={drillDownUrl ? () => router.push(drillDownUrl) : undefined}
      role={drillDownUrl ? 'button' : undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{data.label}</p>
        <div className="flex items-center gap-1">
          {getTrendIcon(data.trend30d)}
          {data.partial && <PartialDataBadge reason="Data tidak lengkap" className="scale-75 origin-right" />}
        </div>
      </div>

      <div className="flex items-end gap-1">
        <span className="text-xl font-bold text-gray-800 dark:text-gray-100">
          {data.value !== null ? data.value.toFixed(1) : '—'}
        </span>
        {data.unit && <span className="text-xs text-gray-400 mb-0.5">{data.unit}</span>}
      </div>

      {data.target && (
        <p className="text-xs text-gray-400 mb-2">Target: {data.target}{data.unit ?? ''}</p>
      )}

      {progressPct !== null && data.target && (
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getProgressColor(data.value!, data.target)}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function KPIMini(props: KPIMiniProps) {
  return (
    <WidgetErrorBoundary widgetName="KPIMini">
      <KPIMiniInner {...props} />
    </WidgetErrorBoundary>
  );
}
