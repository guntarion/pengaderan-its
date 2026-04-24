'use client';

/**
 * /admin/users
 * SC, SUPERADMIN, PEMBINA, BLM, SATGAS — list users with filters.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { UserCog, Upload } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';

const log = createLogger('admin-users-page');

const ROLES = [
  'MABA', 'KP', 'KASUH', 'OC', 'ELDER', 'SC',
  'PEMBINA', 'BLM', 'SATGAS', 'ALUMNI', 'DOSEN_WALI', 'SUPERADMIN',
];

interface User {
  id: string;
  email: string;
  fullName: string;
  displayName: string | null;
  nrp: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  currentCohort: { code: string; name: string } | null;
  paktaPanitiaStatus: string;
  socialContractStatus: string;
}

const roleColor = (r: string) => {
  switch (r) {
    case 'SUPERADMIN': return 'bg-violet-100 text-violet-800 border-violet-300';
    case 'SC': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'PEMBINA': case 'BLM': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'SATGAS': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'ELDER': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'MABA': return 'bg-amber-100 text-amber-800 border-amber-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function UsersPage() {
  const router = useRouter();
  const { user: viewer } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const canManage = viewer?.role === 'SC' || viewer?.role === 'SUPERADMIN';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(roleFilter !== 'all' && { role: roleFilter }),
      });
      log.info('Fetching users', { page, roleFilter });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setUsers(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch (err) {
      log.error('Failed to fetch users', { err });
      toast.error('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'fullName',
      header: ({ column }) => <SortableHeader column={column}>Nama</SortableHeader>,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.fullName}</div>
          {row.original.displayName && (
            <div className="text-xs text-gray-500">{row.original.displayName}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div>
          <div className="text-sm">{row.original.email}</div>
          {row.original.nrp && (
            <div className="text-xs text-gray-500 font-mono">{row.original.nrp}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge className={`text-xs ${roleColor(row.original.role)}`}>
          {row.original.role}
        </Badge>
      ),
    },
    {
      id: 'cohort',
      header: 'Kohort',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.currentCohort?.code ?? '—'}
        </span>
      ),
    },
    {
      id: 'pakta',
      header: 'Pakta',
      cell: ({ row }) => {
        const sc = row.original.socialContractStatus;
        const pp = row.original.paktaPanitiaStatus;
        const color = (s: string) =>
          s === 'SIGNED' ? 'text-emerald-600' : s === 'REJECTED' ? 'text-red-600' : 'text-amber-600';
        return (
          <div className="text-xs space-y-0.5">
            <div>
              SC: <span className={color(sc)}>{sc}</span>
            </div>
            <div>
              PP: <span className={color(pp)}>{pp}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/admin/users/${row.original.id}`)}
        >
          Detail
        </Button>
      ),
    },
  ];

  const toolbar = (
    <div className="flex items-center gap-2">
      <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
        <SelectTrigger className="w-36 h-9 text-sm">
          <SelectValue placeholder="Semua Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Role</SelectItem>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {canManage && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/users/bulk-import')}
        >
          <Upload className="h-4 w-4 mr-1" />
          Import CSV
        </Button>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <UserCog className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Pengguna
              {total > 0 && (
                <span className="ml-2 text-base font-normal text-gray-400">({total})</span>
              )}
            </h1>
            <p className="text-sm text-gray-500">Daftar pengguna dalam organisasi</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        {loading ? (
          <SkeletonTable rows={8} columns={6} />
        ) : (
          <DataTable
            columns={columns}
            data={users}
            searchKey="fullName"
            searchPlaceholder="Cari nama / email..."
            toolbar={toolbar}
          />
        )}
      </div>

      {total > limit && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-gray-600">
            Halaman {page} dari {Math.ceil(total / limit)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / limit)}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
