'use client';

/**
 * /admin/struktur/pairing-requests
 * SC/SUPERADMIN — antrian pairing request + SLA indicator.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin-pairing-requests-page');

interface PairingRequest {
  id: string;
  type: string;
  status: string;
  optionalNote: string | null;
  createdAt: string;
  cohort: { id: string; code: string; name: string };
  requester: { id: string; fullName: string; displayName: string; nrp: string };
  subject: { id: string; fullName: string; displayName: string } | null;
  resolvedBy: { id: string; fullName: string } | null;
}

const statusColor = (s: string) => {
  switch (s) {
    case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'APPROVED': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'FULFILLED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
    case 'CANCELLED': return 'bg-gray-100 text-gray-700 border-gray-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

function slaDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

export default function PairingRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PairingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  async function fetchRequests() {
    try {
      log.info('Fetching pairing requests', { status: statusFilter });
      const params = new URLSearchParams({ status: statusFilter });
      const res = await fetch(`/api/admin/struktur/pairing-requests?${params}`);
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setRequests(json.data ?? []);
    } catch (err) {
      log.error('Failed to fetch pairing requests', { err });
      toast.error('Gagal memuat data Pairing Request');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRequests(); }, [statusFilter]);

  const columns: ColumnDef<PairingRequest>[] = [
    {
      id: 'requester',
      header: ({ column }) => <SortableHeader column={column}>Pemohon</SortableHeader>,
      accessorFn: (row) => row.requester?.fullName,
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {row.original.requester?.displayName ?? row.original.requester?.fullName}
          </p>
          <p className="text-xs text-gray-400">{row.original.requester?.nrp}</p>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Tipe',
      cell: ({ row }) => (
        <Badge className={`text-xs ${
          row.original.type === 'RE_PAIR_KASUH'
            ? 'bg-violet-100 text-violet-800 border-violet-200'
            : 'bg-orange-100 text-orange-800 border-orange-200'
        }`}>
          {row.original.type === 'RE_PAIR_KASUH' ? 'Re-Pair Kasuh' : 'Kasuh Unreachable'}
        </Badge>
      ),
    },
    {
      id: 'cohort',
      header: 'Kohort',
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">{row.original.cohort?.code ?? '-'}</span>
      ),
    },
    {
      id: 'sla',
      header: 'SLA',
      cell: ({ row }) => {
        const days = slaDays(row.original.createdAt);
        const isOverdue = days > 3 && row.original.status === 'PENDING';
        return (
          <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
            {days} hari {isOverdue && '(Overdue)'}
          </span>
        );
      },
    },
    {
      id: 'createdAt',
      header: 'Diajukan',
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {new Date(row.original.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={`text-xs ${statusColor(row.original.status)}`}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/admin/struktur/pairing-requests/${row.original.id}`)}
        >
          Tinjau
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pairing Requests</h1>
            <p className="text-sm text-gray-500">Antrian permintaan re-pair dari MABA</p>
          </div>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {['PENDING', 'APPROVED', 'FULFILLED', 'REJECTED'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setLoading(true); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-sky-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        {loading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : (
          <DataTable
            columns={columns}
            data={requests}
            searchKey="type"
            searchPlaceholder="Cari tipe request..."
          />
        )}
      </div>
    </div>
  );
}
