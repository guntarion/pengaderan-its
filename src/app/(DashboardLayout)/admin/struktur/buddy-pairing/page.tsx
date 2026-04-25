'use client';

/**
 * /admin/struktur/buddy-pairing
 * SC/OC/SUPERADMIN — daftar Buddy Pair.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users2, Shuffle } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin-buddy-pairing-page');

interface BuddyPair {
  id: string;
  status: string;
  algorithmVersion: string;
  algorithmSeed: string | null;
  createdAt: string;
  cohort: { id: string; code: string };
  members: Array<{
    id: string;
    user: { id: string; fullName: string; displayName: string; nrp: string };
  }>;
}

const statusColor = (s: string) => {
  switch (s) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'ARCHIVED': return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'REASSIGNED': return 'bg-amber-100 text-amber-800 border-amber-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function BuddyPairingListPage() {
  const router = useRouter();
  const [pairs, setPairs] = useState<BuddyPair[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPairs() {
    try {
      log.info('Fetching buddy pairs');
      const res = await fetch('/api/admin/struktur/buddy-pairs');
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setPairs(json.data ?? []);
    } catch (err) {
      log.error('Failed to fetch buddy pairs', { err });
      toast.error('Gagal memuat data Buddy Pair');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPairs(); }, []);

  const columns: ColumnDef<BuddyPair>[] = [
    {
      id: 'members',
      header: 'Anggota',
      cell: ({ row }) => (
        <div className="space-y-0.5">
          {row.original.members.map((m) => (
            <p key={m.id} className="text-sm text-gray-700 dark:text-gray-300">
              {m.user.displayName ?? m.user.fullName}
            </p>
          ))}
        </div>
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
      id: 'algorithm',
      header: 'Algoritma',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-gray-500">{row.original.algorithmVersion}</span>
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
        <SkeletonTable rows={8} columns={5} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <Users2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Buddy Pairing</h1>
            <p className="text-sm text-gray-500">Pasangan buddy MABA lintas-jurusan</p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/admin/struktur/buddy-pairing/generate')}
          className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl"
        >
          <Shuffle className="h-4 w-4 mr-2" />
          Generate Buddy Pair
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
