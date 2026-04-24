/**
 * src/components/dashboard/widgets/KirkpatrickSnapshot.tsx
 * Kirkpatrick L1-L4 four-card snapshot widget.
 */

'use client';

import React from 'react';
import { BarChart2Icon } from 'lucide-react';
import { PartialDataBadge } from './PartialDataBadge';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { Sparkline } from '@/components/dashboard/charts/Sparkline';
import { EmptyState } from './EmptyState';
import type { WidgetState } from '@/types/dashboard';
import type { KirkpatrickSnapshot as KirkpatrickData } from '@/lib/dashboard/aggregation/kirkpatrick';
import { useRouter } from 'next/navigation';

interface KirkpatrickSnapshotProps {
  state: WidgetState<KirkpatrickData>;
  className?: string;
}

const LEVEL_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b'] as const;
const LEVEL_DRILL_DOWN_PATHS = [
  '/dashboard/oc/kegiatan?tab=nps',
  '/dashboard/kp?tab=rubrik',
  '/dashboard/attendance',
  '/dashboard/sc?tab=retention',
];

function KirkpatrickSnapshotInner({ state, className = '' }: KirkpatrickSnapshotProps) {
  const router = useRouter();

  if (state.status === 'loading') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <p className="text-xs font-semibold text-gray-700 mb-2">Kirkpatrick Snapshot</p>
        <EmptyState variant="error" description={state.error} />
      </div>
    );
  }

  if (state.status === 'empty') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <p className="text-xs font-semibold text-gray-700 mb-2">Kirkpatrick Snapshot</p>
        <EmptyState />
      </div>
    );
  }

  const data = state.status === 'data' ? state.data : state.data as KirkpatrickData;

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart2Icon className="h-4 w-4 text-sky-500" />
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Kirkpatrick Framework
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {data.levels.map((level, i) => (
          <button
            key={level.level}
            type="button"
            className="text-left rounded-xl border border-sky-50 dark:border-slate-700 p-3 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors"
            onClick={() => router.push(LEVEL_DRILL_DOWN_PATHS[i])}
          >
            <div className="flex items-start justify-between mb-1">
              <span
                className="text-xs font-medium"
                style={{ color: LEVEL_COLORS[i] }}
              >
                L{level.level}
              </span>
              {level.partial && (
                <PartialDataBadge reason={level.partialReason ?? 'Data tidak lengkap'} />
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{level.label}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {level.value !== null ? level.value.toFixed(1) : '—'}
            </p>
            {level.target && (
              <p className="text-xs text-gray-400">Target: {level.target}</p>
            )}
            {level.trend30d.length > 1 && (
              <Sparkline
                data={level.trend30d}
                color={LEVEL_COLORS[i]}
                height={28}
                className="mt-2"
              />
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        Terakhir dihitung: {new Date(data.computedAt).toLocaleDateString('id-ID')}
      </p>
    </div>
  );
}

export function KirkpatrickSnapshot(props: KirkpatrickSnapshotProps) {
  return (
    <WidgetErrorBoundary widgetName="KirkpatrickSnapshot">
      <KirkpatrickSnapshotInner {...props} />
    </WidgetErrorBoundary>
  );
}
