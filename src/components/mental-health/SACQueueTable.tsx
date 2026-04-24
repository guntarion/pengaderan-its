'use client';

/**
 * src/components/mental-health/SACQueueTable.tsx
 * NAWASENA M11 — SAC screening queue table.
 *
 * PRIVACY-CRITICAL: No Maba PII displayed. Only severity, instrument, phase,
 * SLA countdown, status, and immediateContact flag are shown.
 *
 * Default sort: RED severity first, then nearest SLA deadline.
 * Uses DataTable from ui-components-guide pattern.
 */

import React from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export interface SACReferralItem {
  id: string;
  status: string;
  slaDeadlineAt: string | Date;
  escalatedAt: string | Date | null;
  acknowledgedAt: string | Date | null;
  createdAt: string | Date;
  screening: {
    id: string;
    instrument: string;
    phase: string;
    severity: string;
    immediateContact: boolean;
    flagged: boolean;
    recordedAt: string | Date;
  } | null;
}

interface SACQueueTableProps {
  referrals: SACReferralItem[];
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { label: string; className: string }> = {
    RED: { label: 'Merah', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300' },
    YELLOW: { label: 'Kuning', className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300' },
    GREEN: { label: 'Hijau', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300' },
  };
  const { label, className } = config[severity] ?? { label: severity, className: '' };
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Menunggu', className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300' },
    IN_PROGRESS: { label: 'Dalam Proses', className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300' },
    RESOLVED: { label: 'Selesai', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300' },
    REASSIGNED: { label: 'Dialihkan', className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300' },
    ESCALATED: { label: 'Dieskalasi', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300' },
  };
  const { label, className } = config[status] ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

function SLACountdown({ deadline, immediateContact }: { deadline: string | Date; immediateContact: boolean }) {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const isPast = deadlineDate < new Date();
  const distance = formatDistanceToNow(deadlineDate, { addSuffix: true, locale: idLocale });

  return (
    <span className={`text-sm font-medium ${isPast ? 'text-red-600 dark:text-red-400' : immediateContact ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'}`}>
      {isPast ? `Terlampaui ${distance}` : distance}
    </span>
  );
}

const columns: ColumnDef<SACReferralItem>[] = [
  {
    id: 'severity',
    accessorFn: (row) => row.screening?.severity ?? '',
    header: ({ column }) => <SortableHeader column={column}>Tingkat</SortableHeader>,
    cell: ({ row }) => {
      const severity = row.original.screening?.severity;
      return severity ? <SeverityBadge severity={severity} /> : <span className="text-gray-400">—</span>;
    },
    sortingFn: (a, b) => {
      const order = { RED: 0, YELLOW: 1, GREEN: 2 };
      const aVal = order[a.original.screening?.severity as keyof typeof order] ?? 3;
      const bVal = order[b.original.screening?.severity as keyof typeof order] ?? 3;
      return aVal - bVal;
    },
  },
  {
    id: 'instrument',
    accessorFn: (row) => row.screening?.instrument ?? '',
    header: 'Instrumen',
    cell: ({ row }) => (
      <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
        {row.original.screening?.instrument ?? '—'}
      </span>
    ),
  },
  {
    id: 'phase',
    accessorFn: (row) => row.screening?.phase ?? '',
    header: 'Fase',
    cell: ({ row }) => (
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {row.original.screening?.phase ?? '—'}
      </span>
    ),
  },
  {
    id: 'submittedAt',
    accessorFn: (row) => row.screening?.recordedAt ?? '',
    header: ({ column }) => <SortableHeader column={column}>Diserahkan</SortableHeader>,
    cell: ({ row }) => {
      const recordedAt = row.original.screening?.recordedAt;
      if (!recordedAt) return <span className="text-gray-400">—</span>;
      const d = typeof recordedAt === 'string' ? new Date(recordedAt) : recordedAt;
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      );
    },
  },
  {
    id: 'slaDeadline',
    accessorFn: (row) => row.slaDeadlineAt,
    header: ({ column }) => <SortableHeader column={column}>Batas SLA</SortableHeader>,
    cell: ({ row }) => (
      <SLACountdown
        deadline={row.original.slaDeadlineAt}
        immediateContact={row.original.screening?.immediateContact ?? false}
      />
    ),
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: 'immediateContact',
    accessorFn: (row) => row.screening?.immediateContact ?? false,
    header: 'Prioritas',
    cell: ({ row }) => {
      const immediate = row.original.screening?.immediateContact;
      return immediate ? (
        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs font-bold">SEGERA</span>
        </div>
      ) : (
        <span className="text-xs text-gray-400">Normal</span>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Link
        href={`/dashboard/sac/screening-queue/${row.original.id}`}
        className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium"
      >
        Lihat
      </Link>
    ),
  },
];

export function SACQueueTable({ referrals }: SACQueueTableProps) {
  // Default sort: RED first, then nearest SLA deadline
  const sorted = [...referrals].sort((a, b) => {
    const severityOrder = { RED: 0, YELLOW: 1, GREEN: 2 };
    const aSev = severityOrder[a.screening?.severity as keyof typeof severityOrder] ?? 3;
    const bSev = severityOrder[b.screening?.severity as keyof typeof severityOrder] ?? 3;
    if (aSev !== bSev) return aSev - bSev;
    const aDeadline = new Date(a.slaDeadlineAt).getTime();
    const bDeadline = new Date(b.slaDeadlineAt).getTime();
    return aDeadline - bDeadline;
  });

  return (
    <DataTable
      columns={columns}
      data={sorted}
      searchKey="status"
      searchPlaceholder="Cari berdasarkan status..."
    />
  );
}

export default SACQueueTable;
