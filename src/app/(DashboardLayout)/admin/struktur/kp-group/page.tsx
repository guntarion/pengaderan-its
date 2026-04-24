'use client';

/**
 * /admin/struktur/kp-group
 * SC/OC/SUPERADMIN — daftar KP Group.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Network } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin-kp-group-page');

interface KPGroup {
  id: string;
  code: string;
  name: string;
  status: string;
  capacityTarget: number;
  capacityMax: number;
  cohort: { id: string; code: string; name: string };
  coordinator: { id: string; fullName: string; displayName: string } | null;
  _count?: { members: number };
}

const statusColor = (s: string) => {
  switch (s) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'DRAFT': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'ARCHIVED': return 'bg-gray-100 text-gray-700 border-gray-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function KPGroupListPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<KPGroup[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchGroups() {
    try {
      log.info('Fetching KP groups');
      const res = await fetch('/api/admin/struktur/kp-groups');
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setGroups(json.data ?? []);
    } catch (err) {
      log.error('Failed to fetch KP groups', { err });
      toast.error('Gagal memuat data KP Group');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchGroups(); }, []);

  const columns: ColumnDef<KPGroup>[] = [
    {
      accessorKey: 'code',
      header: ({ column }) => <SortableHeader column={column}>Kode</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>Nama</SortableHeader>,
    },
    {
      id: 'cohort',
      header: 'Kohort',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.cohort?.code ?? '-'}
        </span>
      ),
    },
    {
      id: 'coordinator',
      header: 'Koordinator KP',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.coordinator?.displayName ?? row.original.coordinator?.fullName ?? '-'}
        </span>
      ),
    },
    {
      id: 'capacity',
      header: 'Kapasitas',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.original._count?.members ?? 0} / {row.original.capacityMax}
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
          onClick={() => router.push(`/admin/struktur/kp-group/${row.original.id}`)}
        >
          Detail
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <SkeletonTable rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">KP Group</h1>
            <p className="text-sm text-gray-500">Kelompok Pendamping Angkatan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/struktur/kp-group/bulk-assign')}
          >
            Bulk Assign
          </Button>
          <Button
            onClick={() => router.push('/admin/struktur/kp-group/new')}
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah KP Group
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={groups}
          searchKey="name"
          searchPlaceholder="Cari nama KP Group..."
        />
      </div>
    </div>
  );
}
