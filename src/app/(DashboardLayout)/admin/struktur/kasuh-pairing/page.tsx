'use client';

/**
 * /admin/struktur/kasuh-pairing
 * SC/OC/SUPERADMIN — daftar Kasuh Pair.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Shuffle } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin-kasuh-pairing-page');

interface KasuhPair {
  id: string;
  status: string;
  matchScore: number;
  createdAt: string;
  cohort: { id: string; code: string };
  maba: { id: string; fullName: string; displayName: string; nrp: string };
  kasuh: { id: string; fullName: string; displayName: string; nrp: string };
}

const statusColor = (s: string) => {
  switch (s) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'ARCHIVED': return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'REASSIGNED': return 'bg-amber-100 text-amber-800 border-amber-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function KasuhPairingListPage() {
  const router = useRouter();
  const [pairs, setPairs] = useState<KasuhPair[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPairs() {
    try {
      log.info('Fetching kasuh pairs');
      const res = await fetch('/api/admin/struktur/kasuh-pairs');
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setPairs(json.data ?? []);
    } catch (err) {
      log.error('Failed to fetch kasuh pairs', { err });
      toast.error('Gagal memuat data Kasuh Pair');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPairs(); }, []);

  const columns: ColumnDef<KasuhPair>[] = [
    {
      id: 'maba',
      header: ({ column }) => <SortableHeader column={column}>MABA</SortableHeader>,
      accessorFn: (row) => row.maba?.fullName,
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {row.original.maba?.displayName ?? row.original.maba?.fullName}
          </p>
          <p className="text-xs text-gray-400">{row.original.maba?.nrp}</p>
        </div>
      ),
    },
    {
      id: 'kasuh',
      header: 'Kasuh',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {row.original.kasuh?.displayName ?? row.original.kasuh?.fullName}
          </p>
          <p className="text-xs text-gray-400">{row.original.kasuh?.nrp}</p>
        </div>
      ),
    },
    {
      id: 'matchScore',
      header: 'Skor',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-gray-600">
          {row.original.matchScore.toFixed(2)}
        </span>
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
      id: 'createdAt',
      header: 'Dibuat',
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
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <SkeletonTable rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Kasuh Pairing</h1>
            <p className="text-sm text-gray-500">Pasangan Kakak Asuh — Adik Asuh (MABA)</p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/admin/struktur/kasuh-pairing/suggest')}
          className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl"
        >
          <Shuffle className="h-4 w-4 mr-2" />
          Suggest & Assign Kasuh
        </Button>
      </div>

      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={pairs}
          searchKey="status"
          searchPlaceholder="Filter status..."
        />
      </div>
    </div>
  );
}
