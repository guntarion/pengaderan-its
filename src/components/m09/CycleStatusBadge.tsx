'use client';

/**
 * src/components/m09/CycleStatusBadge.tsx
 * NAWASENA M09 — Cycle status badge for Kasuh biweekly logbook.
 *
 * Shows current cycle status: SUBMITTED, DUE, OVERDUE, or UPCOMING.
 */

import { CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';

export type CycleStatus = 'SUBMITTED' | 'DUE' | 'OVERDUE' | 'UPCOMING';

interface CycleStatusBadgeProps {
  status: CycleStatus;
  daysOverdue?: number;
  dueDate?: string;
}

const STATUS_CONFIG: Record<
  CycleStatus,
  {
    label: string;
    bg: string;
    text: string;
    icon: React.ReactNode;
  }
> = {
  SUBMITTED: {
    label: 'Sudah Diisi',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  DUE: {
    label: 'Perlu Diisi',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  OVERDUE: {
    label: 'Terlambat',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  UPCOMING: {
    label: 'Belum Waktunya',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    icon: <Calendar className="h-3.5 w-3.5" />,
  },
};

export function CycleStatusBadge({ status, daysOverdue, dueDate }: CycleStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col items-start gap-0.5">
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}
      >
        {config.icon}
        {config.label}
        {status === 'OVERDUE' && daysOverdue !== undefined && (
          <span className="ml-0.5">({daysOverdue}h)</span>
        )}
      </span>
      {dueDate && status === 'DUE' && (
        <span className="text-xs text-gray-400 pl-1">
          Jatuh tempo:{' '}
          {new Date(dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
        </span>
      )}
    </div>
  );
}
