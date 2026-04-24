/**
 * src/components/dashboard/widgets/RedFlagList.tsx
 * Compact red flag alert list with acknowledge/dismiss actions.
 */

'use client';

import React from 'react';
import { FlagIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { toast } from '@/lib/toast';
import type { WidgetState, AlertItem } from '@/types/dashboard';
import { getDrilldownUrl } from '@/lib/dashboard/drilldown';
import { useRouter } from 'next/navigation';

interface RedFlagListProps {
  state: WidgetState<AlertItem[]>;
  onActionComplete?: () => void;
  className?: string;
}

function getSeverityDot(severity: AlertItem['severity']) {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-500';
    case 'HIGH': return 'bg-orange-500';
    case 'MEDIUM': return 'bg-amber-500';
    default: return 'bg-blue-500';
  }
}

async function handleAlertAction(alertId: string, action: 'acknowledge' | 'dismiss') {
  const res = await fetch(`/api/dashboard/alerts/${alertId}/${action}`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    toast.apiError(data);
    return false;
  }
  return true;
}

function RedFlagListInner({ state, onActionComplete, className = '' }: RedFlagListProps) {
  const router = useRouter();

  if (state.status === 'loading') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          {[1, 2].map((i) => <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded" />)}
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <EmptyState variant="error" />
      </div>
    );
  }

  const alerts = (state.status === 'data' || state.status === 'partial')
    ? (state.data as AlertItem[] | undefined) ?? []
    : [];

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <FlagIcon className="h-4 w-4 text-red-500" />
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Red Flags</p>
        {alerts.length > 0 && (
          <span className="ml-auto rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-2 py-0.5">
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <EmptyState icon={<FlagIcon className="h-6 w-6" />} title="Tidak ada red flag aktif" />
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-2 rounded-xl border border-sky-50 dark:border-slate-700 p-3">
              <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${getSeverityDot(alert.severity)}`} />
              <button
                type="button"
                className="flex-1 text-left min-w-0"
                onClick={() => router.push(getDrilldownUrl(alert))}
              >
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                  {alert.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(alert.firstSeenAt).toLocaleDateString('id-ID')}
                </p>
              </button>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  type="button"
                  className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                  title="Acknowledge"
                  onClick={async () => {
                    const ok = await handleAlertAction(alert.id, 'acknowledge');
                    if (ok) {
                      toast.success('Alert diakui');
                      onActionComplete?.();
                    }
                  }}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Dismiss"
                  onClick={async () => {
                    const ok = await handleAlertAction(alert.id, 'dismiss');
                    if (ok) {
                      toast.success('Alert diabaikan');
                      onActionComplete?.();
                    }
                  }}
                >
                  <XCircleIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RedFlagList(props: RedFlagListProps) {
  return (
    <WidgetErrorBoundary widgetName="RedFlagList">
      <RedFlagListInner {...props} />
    </WidgetErrorBoundary>
  );
}
