'use client';

/**
 * /admin/pakta/[id]/signers
 * List of users who signed a specific pakta version.
 * Roles: SC, SUPERADMIN, PEMBINA, BLM
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { FileText } from 'lucide-react';

const log = createLogger('admin-pakta-signers');

interface Signer {
  id: string;
  status: string;
  signedAt: string;
  quizScore: number | null;
  user: { fullName: string; email: string; nrp: string | null; role: string };
}

const signatureStatusColor = (s: string) => {
  switch (s) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'SUPERSEDED': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'REVOKED': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function PaktaSignersPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [signers, setSigners] = useState<Signer[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchSigners = useCallback(async () => {
    setLoading(true);
    try {
      log.info('Fetching pakta signers', { versionId: params.id });
      const res = await fetch(`/api/admin/pakta/versions/${params.id}/signers?page=${page}&limit=${limit}`);
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setSigners(json.data ?? []);
      setTotal(json.meta?.pagination?.total ?? 0);
    } catch (err) {
      log.error('Failed to fetch signers', { err });
      toast.error('Gagal memuat data penanda tangan');
    } finally {
      setLoading(false);
    }
  }, [params.id, page]);

  useEffect(() => {
    fetchSigners();
  }, [fetchSigners]);

  const columns: ColumnDef<Signer>[] = [
    {
      accessorKey: 'user.fullName',
      header: ({ column }) => <SortableHeader column={column}>Nama</SortableHeader>,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.user.fullName}</div>
          <div className="text-xs text-gray-400">{row.original.user.email}</div>
        </div>
      ),
    },
    {
      id: 'nrp',
      header: 'NRP',
      cell: ({ row }) => (
        <span className="text-sm font-mono">{row.original.user.nrp ?? '—'}</span>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge className="text-xs bg-sky-100 text-sky-800 border-sky-300">
          {row.original.user.role}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={`text-xs ${signatureStatusColor(row.original.status)}`}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'quizScore',
      header: 'Skor Quiz',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.quizScore != null ? `${row.original.quizScore}%` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'signedAt',
      header: ({ column }) => <SortableHeader column={column}>Ditandatangani</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-xs text-gray-500">
          {new Date(row.original.signedAt).toLocaleString('id-ID')}
        </span>
      ),
    },
  ];

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb
        labels={{ [params.id]: 'Penanda Tangan', 'signers': 'Penanda Tangan' }}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Penanda Tangan
              {total > 0 && (
                <span className="ml-2 text-base font-normal text-gray-400">({total})</span>
              )}
            </h1>
            <p className="text-sm text-gray-500">Daftar pengguna yang telah menandatangani versi ini</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/pakta')}>
          Kembali
        </Button>
      </div>

      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        {loading ? (
          <SkeletonTable rows={8} columns={6} />
        ) : (
          <DataTable
            columns={columns}
            data={signers}
            searchKey="user.fullName"
            searchPlaceholder="Cari nama..."
          />
        )}
      </div>

      {totalPages > 1 && (
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
            Halaman {page} dari {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
