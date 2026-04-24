'use client';

/**
 * src/components/anon-report/ReportDataTable.tsx
 * NAWASENA M12 — Reusable data table for anonymous reports list.
 *
 * Uses DataTable from @/components/shared/DataTable.
 * Tracking code shown as masked: "NW-****XXXX" (already masked by API).
 */

import Link from 'next/link';
import { DataTable } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { SeverityBadge } from './SeverityBadge';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ShieldAlert } from 'lucide-react';
import { AnonSeverity, AnonStatus, AnonCategory } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export interface ReportRow {
  id: string;
  /** Already masked: "NW-****XXXX" */
  trackingCode: string;
  category: AnonCategory;
  severity: AnonSeverity;
  status: AnonStatus;
  satgasEscalated: boolean;
  recordedAt: string | Date;
}

const STATUS_LABELS: Record<AnonStatus, string> = {
  NEW: 'Baru',
  IN_REVIEW: 'Ditinjau',
  RESOLVED: 'Selesai',
  ESCALATED_TO_SATGAS: 'Diteruskan Satgas',
};

const STATUS_COLORS: Record<AnonStatus, string> = {
  NEW: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  IN_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  ESCALATED_TO_SATGAS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const CATEGORY_LABELS: Record<AnonCategory, string> = {
  BULLYING: 'Perundungan',
  HARASSMENT: 'Pelecehan',
  UNFAIR: 'Ketidakadilan',
  SUGGESTION: 'Saran',
  OTHER: 'Lainnya',
};

interface ReportDataTableProps {
  reports: ReportRow[];
  isLoading?: boolean;
  detailBasePath?: string; // e.g. '/dashboard/blm/anon-reports' or '/dashboard/satgas/escalated-reports'
}

export function ReportDataTable({
  reports,
  isLoading,
  detailBasePath = '/dashboard/blm/anon-reports',
}: ReportDataTableProps) {
  const columns: ColumnDef<ReportRow>[] = [
    {
      accessorKey: 'trackingCode',
      header: 'Kode',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {row.original.trackingCode}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Kategori',
      cell: ({ row }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {CATEGORY_LABELS[row.original.category] ?? row.original.category}
        </span>
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Tingkat',
      cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.original.status]}`}
        >
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'satgasEscalated',
      header: 'Satgas',
      cell: ({ row }) =>
        row.original.satgasEscalated ? (
          <span title="Diteruskan ke Satgas">
            <ShieldAlert className="h-4 w-4 text-orange-500" />
          </span>
        ) : null,
    },
    {
      accessorKey: 'recordedAt',
      header: 'Dilaporkan',
      cell: ({ row }) => {
        const date =
          row.original.recordedAt instanceof Date
            ? row.original.recordedAt
            : new Date(row.original.recordedAt);
        return (
          <span className="text-xs text-gray-500 dark:text-gray-400" title={date.toLocaleString('id-ID')}>
            {formatDistanceToNow(date, { addSuffix: true, locale: localeId })}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Link
          href={`${detailBasePath}/${row.original.id}`}
          className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
        >
          Detail
        </Link>
      ),
    },
  ];

  if (isLoading) {
    return <SkeletonCard />;
  }

  return (
    <div className="rounded-2xl border border-sky-100 bg-white dark:border-sky-900 dark:bg-gray-900">
      <DataTable
        columns={columns}
        data={reports}
        searchKey="trackingCode"
        searchPlaceholder="Cari kode laporan..."
      />
    </div>
  );
}
