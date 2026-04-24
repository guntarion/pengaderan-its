'use client';

/**
 * src/app/(DashboardLayout)/dashboard/safeguard/consequences/page.tsx
 * NAWASENA M10 — SC/SG-Officer list of all consequence logs.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Plus, ShieldAlert } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import type { ConsequenceStatus, ConsequenceType } from '@prisma/client';

const log = createLogger('consequences-list-page');

interface ConsequenceRow {
  id: string;
  type: ConsequenceType;
  status: ConsequenceStatus;
  reasonText: string;
  deadline: string | null;
  createdAt: string;
  user: { id: string; fullName: string; displayName: string | null };
  assignedBy: { id: string; fullName: string };
}

const STATUS_COLORS: Record<ConsequenceStatus, string> = {
  ASSIGNED: 'bg-sky-100 text-sky-800 border-sky-200',
  PENDING_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
  NEEDS_REVISION: 'bg-orange-100 text-orange-800 border-orange-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  OVERDUE: 'bg-red-100 text-red-800 border-red-200',
  FORFEITED: 'bg-gray-100 text-gray-800 border-gray-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const TYPE_LABELS: Record<ConsequenceType, string> = {
  REFLEKSI_500_KATA: 'Refleksi 500 Kata',
  PRESENTASI_ULANG: 'Presentasi Ulang',
  POIN_PASSPORT_DIKURANGI: 'Kurangi Poin Passport',
  PERINGATAN_TERTULIS: 'Peringatan Tertulis',
  TUGAS_PENGABDIAN: 'Tugas Pengabdian',
};

const columns: ColumnDef<ConsequenceRow>[] = [
  {
    accessorKey: 'user',
    header: ({ column }) => <SortableHeader column={column}>Maba</SortableHeader>,
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.user.displayName ?? row.original.user.fullName}</p>
      </div>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Tipe',
    cell: ({ row }) => (
      <span className="text-sm">{TYPE_LABELS[row.original.type]}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge className={`text-xs ${STATUS_COLORS[row.original.status]}`}>
        {row.original.status.replace(/_/g, ' ')}
      </Badge>
    ),
  },
  {
    accessorKey: 'deadline',
    header: 'Deadline',
    cell: ({ row }) =>
      row.original.deadline ? (
        <span className="text-xs text-gray-500">
          {new Date(row.original.deadline).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ) : (
        <span className="text-xs text-gray-400">-</span>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Di-assign',
    cell: ({ row }) => (
      <span className="text-xs text-gray-500">
        {new Date(row.original.createdAt).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Link href={`/dashboard/safeguard/consequences/${row.original.id}`}>
        <Button variant="ghost" size="sm" className="text-sky-600 hover:text-sky-700 dark:text-sky-400">
          Detail
        </Button>
      </Link>
    ),
  },
];

export default function ConsequencesListPage() {
  const [data, setData] = useState<ConsequenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/safeguard/consequences?limit=50');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setData(json.data ?? []);
        setTotal(json.meta?.pagination?.total ?? 0);
      } catch (err) {
        log.error('Failed to fetch consequences', { err });
        toast.error('Gagal memuat data konsekuensi');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-5xl">
          <DynamicBreadcrumb />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6" />
              <div>
                <h1 className="text-xl font-bold">Konsekuensi Pedagogis</h1>
                <p className="text-sm text-white/80">
                  {total} konsekuensi tercatat
                </p>
              </div>
            </div>
            <Link href="/dashboard/safeguard/consequences/new">
              <Button
                variant="outline"
                className="bg-transparent border-white/40 text-white hover:bg-white/10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign Konsekuensi
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-5xl p-6">
        {loading ? (
          <SkeletonTable rows={8} columns={5} />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm overflow-hidden">
            <DataTable
              columns={columns}
              data={data}
              searchKey="user"
              searchPlaceholder="Cari maba..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
