/**
 * src/components/dashboard/widgets/AlertsPanel.tsx
 * Alerts panel showing active red flag alerts, filterable by severity.
 */

'use client';

import React, { useState } from 'react';
import { AlertTriangleIcon, ShieldAlertIcon } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import type { WidgetState, AlertItem } from '@/types/dashboard';
import { getDrilldownUrl } from '@/lib/dashboard/drilldown';
import { useRouter } from 'next/navigation';

interface AlertsPanelProps {
  state: WidgetState<AlertItem[]>;
  maxItems?: number;
  className?: string;
}

function getSeverityBadge(severity: AlertItem['severity']) {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    case 'HIGH':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
    case 'MEDIUM':
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    case 'LOW':
    default:
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  }
}

function AlertsPanelInner({ state, maxItems = 5, className = '' }: AlertsPanelProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<AlertItem['severity'] | 'ALL'>('ALL');

  if (state.status === 'loading') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <p className="text-xs font-medium text-gray-500 mb-2">Alert Aktif</p>
        <EmptyState variant="error" description={state.error} />
      </div>
    );
  }

  const alerts = (state.status === 'empty' ? [] : (state.status === 'data' || state.status === 'partial') ? (state.data as AlertItem[] | undefined) ?? [] : [])
    .filter((a) => filter === 'ALL' || a.severity === filter)
    .slice(0, maxItems);

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlertIcon className="h-4 w-4 text-red-500" />
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Alert Aktif</p>
        </div>
        <select
          className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="ALL">Semua</option>
          <option value="CRITICAL">Kritis</option>
          <option value="HIGH">Tinggi</option>
          <option value="MEDIUM">Sedang</option>
          <option value="LOW">Rendah</option>
        </select>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={<AlertTriangleIcon className="h-6 w-6" />}
          title="Tidak ada alert aktif"
          description={filter !== 'ALL' ? `Tidak ada alert ${filter}` : undefined}
        />
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              className="w-full text-left rounded-xl border border-sky-50 dark:border-slate-700 p-3 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => router.push(getDrilldownUrl(alert))}
            >
              <div className="flex items-start gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${getSeverityBadge(alert.severity)}`}>
                  {alert.severity}
                </span>
                <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{alert.title}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AlertsPanel(props: AlertsPanelProps) {
  return (
    <WidgetErrorBoundary widgetName="AlertsPanel">
      <AlertsPanelInner {...props} />
    </WidgetErrorBoundary>
  );
}
