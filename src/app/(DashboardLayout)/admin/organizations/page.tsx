'use client';

/**
 * /admin/organizations
 * SUPERADMIN — list and manage organizations.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2 } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin-organizations-page');

interface Org {
  id: string;
  code: string;
  name: string;
  fullName: string;
  status: string;
  createdAt: string;
  _count: { users: number; cohorts: number };
}

const statusColor = (s: string) => {
  switch (s) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'INACTIVE': return 'bg-gray-100 text-gray-700 border-gray-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function OrganizationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrgs() {
      try {
        log.info('Fetching organizations');
        const res = await fetch('/api/admin/organizations');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setOrgs(json.data ?? []);
      } catch (err) {
        log.error('Failed to fetch organizations', { err });
        toast.error('Gagal memuat data organisasi');
      } finally {
        setLoading(false);
      }
    }
    fetchOrgs();
  }, []);

  const columns: ColumnDef<Org>[] = [
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
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-gray-500 truncate max-w-xs">{row.original.fullName}</div>
        </div>
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
      id: '_count',
      header: 'Anggota / Kohort',
      cell: ({ row }) => (
        <div className="text-sm">
          <span className="font-semibold">{row.original._count.users}</span>
          <span className="text-gray-400"> pengguna · </span>
          <span className="font-semibold">{row.original._count.cohorts}</span>
          <span className="text-gray-400"> kohort</span>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Dibuat',
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {new Date(row.original.createdAt).toLocaleDateString('id-ID')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/admin/organizations/${row.original.id}`)}
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
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Organisasi</h1>
            <p className="text-sm text-gray-500">Kelola semua organisasi dalam sistem</p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/admin/organizations/new')}
          className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Organisasi
        </Button>
      </div>

      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={orgs}
          searchKey="name"
          searchPlaceholder="Cari nama organisasi..."
        />
      </div>
    </div>
  );
}
