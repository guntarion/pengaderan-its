'use client';

/**
 * src/components/verifier/QueueTable.tsx
 * NAWASENA M05 — DataTable wrapper for the verifier queue with filter + sort.
 */

import Link from 'next/link';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/passport/StatusBadge';
import { EvidenceTypeBadge } from '@/components/shared/EvidenceTypeBadge';
import { type ColumnDef } from '@tanstack/react-table';

export interface QueueEntry {
  id: string;
  itemName: string;
  dimensi: string;
  evidenceType: string;
  status: string;
  submittedAt: string;
  mabaName: string;
  mabaNrp: string | null;
  mabaNotes: string | null;
  waitingDays: number;
}

interface QueueTableProps {
  entries: QueueEntry[];
}

const columns: ColumnDef<QueueEntry>[] = [
  {
    accessorKey: 'mabaName',
    header: 'Mahasiswa',
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{row.original.mabaName}</p>
        {row.original.mabaNrp && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.original.mabaNrp}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'itemName',
    header: 'Item Passport',
    cell: ({ row }) => (
      <div>
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{row.original.itemName}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{row.original.dimensi}</p>
      </div>
    ),
  },
  {
    accessorKey: 'evidenceType',
    header: 'Tipe Bukti',
    cell: ({ row }) => <EvidenceTypeBadge type={row.original.evidenceType} />,
  },
  {
    accessorKey: 'submittedAt',
    header: 'Dikirim',
    cell: ({ row }) => {
      const date = new Date(row.original.submittedAt);
      return (
        <div>
          <p className="text-xs text-gray-700 dark:text-gray-300">
            {date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          {row.original.waitingDays > 0 && (
            <p
              className={`text-xs font-medium ${
                row.original.waitingDays >= 7
                  ? 'text-red-600 dark:text-red-400'
                  : row.original.waitingDays >= 3
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {row.original.waitingDays} hari lalu
            </p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge status={row.original.status as 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CANCELLED'} />
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Link
        href={`/dashboard/verifier/${row.original.id}/review`}
        className="text-xs px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors font-medium"
      >
        Review
      </Link>
    ),
  },
];

export function QueueTable({ entries }: QueueTableProps) {
  return (
    <DataTable
      columns={columns}
      data={entries}
      searchKey="mabaName"
      searchPlaceholder="Cari nama mahasiswa..."
    />
  );
}
