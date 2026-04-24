'use client';

/**
 * /admin/cohorts
 * SC, SUPERADMIN, PEMBINA, BLM, SATGAS, ELDER — list cohorts.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users2, CheckCircle2 } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';

const log = createLogger('admin-cohorts-page');

interface Cohort {
  id: string;
  code: string;
  name: string;
  status: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  _count: { users: number };
}

const statusColor = (s: string) => {
  switch (s) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'UPCOMING': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'ARCHIVED': return 'bg-gray-100 text-gray-700 border-gray-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function CohortsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  const canManage = user?.role === 'SC' || user?.role === 'SUPERADMIN';

  async function fetchCohorts() {
    try {
      log.info('Fetching cohorts');
      const res = await fetch('/api/admin/cohorts');
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setCohorts(json.data ?? []);
    } catch (err) {
      log.error('Failed to fetch cohorts', { err });
      toast.error('Gagal memuat data kohort');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCohorts();
  }, []);

  async function handleActivate(cohort: Cohort) {
    const confirmed = await confirm({
      title: `Aktifkan Kohort ${cohort.code}?`,
      description: 'Kohort yang sedang aktif akan dinonaktifkan. Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Aktifkan',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActivating(cohort.id);
    try {
      const res = await fetch(`/api/admin/cohorts/${cohort.id}/activate`, { method: 'POST' });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success(`Kohort ${cohort.code} berhasil diaktifkan`);
      await fetchCohorts();
    } catch (err) {
      log.error('Failed to activate cohort', { err });
      toast.error('Gagal mengaktifkan kohort');
    } finally {
      setActivating(null);
    }
  }

  const columns: ColumnDef<Cohort>[] = [
    {
      accessorKey: 'code',
      header: ({ column }) => <SortableHeader column={column}>Kode</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">
            {row.original.code}
          </span>
          {row.original.isActive && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
              Aktif
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>Nama</SortableHeader>,
    },
    {
      id: 'startDate',
      header: 'Mulai',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {new Date(row.original.startDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
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
      id: 'members',
      header: 'Anggota',
      cell: ({ row }) => (
        <span className="text-sm font-semibold">{row.original._count.users}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/cohorts/${row.original.id}`)}
          >
            Detail
          </Button>
          {canManage && !row.original.isActive && row.original.status !== 'ARCHIVED' && (
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
              onClick={() => handleActivate(row.original)}
              disabled={activating === row.original.id}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Aktifkan
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <SkeletonTable rows={5} columns={5} />
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Kohort</h1>
            <p className="text-sm text-gray-500">Kelola kohort dan angkatan</p>
          </div>
        </div>
        {canManage && (
          <Button
            onClick={() => router.push('/admin/cohorts/new')}
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Kohort
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={cohorts}
          searchKey="name"
          searchPlaceholder="Cari nama kohort..."
        />
      </div>

      <ConfirmDialog />
    </div>
  );
}
