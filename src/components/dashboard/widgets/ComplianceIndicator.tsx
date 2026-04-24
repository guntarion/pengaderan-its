/**
 * src/components/dashboard/widgets/ComplianceIndicator.tsx
 * Compliance checklist widget: Pakta %, Social Contract %, FA violations, Permen 55.
 */

'use client';

import React from 'react';
import { ShieldCheckIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon } from 'lucide-react';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { EmptyState } from './EmptyState';
import type { WidgetState, ComplianceData } from '@/types/dashboard';

interface ComplianceIndicatorProps {
  state: WidgetState<ComplianceData>;
  className?: string;
}

function ProgressBar({ percent, label }: { percent: number | null; label: string }) {
  const pct = percent ?? 0;
  const color = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
        <span className={`text-xs font-medium ${pct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
          {percent !== null ? `${pct.toFixed(0)}%` : '—'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: 'green' | 'yellow' | 'red' }) {
  if (status === 'green') return <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />;
  if (status === 'yellow') return <AlertCircleIcon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />;
  return <XCircleIcon className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />;
}

function ComplianceIndicatorInner({ state, className = '' }: ComplianceIndicatorProps) {
  if (state.status === 'loading') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />)}
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <p className="text-xs font-semibold text-gray-700 mb-2">Compliance</p>
        <EmptyState variant="error" description={state.error} />
      </div>
    );
  }

  if (state.status === 'empty') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <p className="text-xs font-semibold text-gray-700 mb-2">Compliance</p>
        <EmptyState />
      </div>
    );
  }

  const data = state.status === 'data' ? state.data : state.data as ComplianceData;

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheckIcon className="h-4 w-4 text-sky-500" />
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Compliance</p>
      </div>

      <ProgressBar percent={data.paktaPanitiaPercent} label="Pakta Panitia Signed" />
      <ProgressBar percent={data.socialContractPercent} label="Social Contract Maba Signed" />

      {data.forbiddenActViolations > 0 && (
        <div className="mb-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
          <p className="text-xs text-red-700 dark:text-red-400">
            Pelanggaran Forbidden Acts: <span className="font-bold">{data.forbiddenActViolations}</span>
          </p>
        </div>
      )}

      {data.permen55Checklist.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Permen 55/2024 Checklist
          </p>
          <div className="space-y-1">
            {data.permen55Checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <StatusDot status={item.status} />
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ComplianceIndicator(props: ComplianceIndicatorProps) {
  return (
    <WidgetErrorBoundary widgetName="ComplianceIndicator">
      <ComplianceIndicatorInner {...props} />
    </WidgetErrorBoundary>
  );
}
