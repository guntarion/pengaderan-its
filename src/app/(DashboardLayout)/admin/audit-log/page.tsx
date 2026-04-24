'use client';

/**
 * /admin/audit-log
 * Audit log viewer.
 * Roles: SC, PEMBINA, BLM, SATGAS, SUPERADMIN
 */

import { useEffect, useState, useCallback } from 'react';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClipboardList } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin-audit-log-page');

interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  reason: string | null;
  ipAddress: string | null;
  actor: { fullName: string; email: string } | null;
  subject: { fullName: string; email: string } | null;
  metadata: unknown;
}

const actionColor = (action: string) => {
  if (action.includes('DELETE') || action.includes('REJECT') || action.includes('REVOKE')) {
    return 'bg-red-100 text-red-800 border-red-300';
  }
  if (action.includes('CREATE') || action.includes('ADD') || action.includes('SIGN')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  }
  if (action.includes('ROLE_CHANGE') || action.includes('UPDATE') || action.includes('ACTIVATE')) {
    return 'bg-amber-100 text-amber-800 border-amber-300';
  }
  if (action.includes('LOGIN') || action.includes('ACCESS')) {
    return 'bg-sky-100 text-sky-800 border-sky-300';
  }
  return 'bg-gray-100 text-gray-700 border-gray-300';
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(from && { from }),
        ...(to && { to }),
        ...(actorFilter && { actorUserId: actorFilter }),
      });
      log.info('Fetching audit log', { page });
      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setEntries(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch (err) {
      log.error('Failed to fetch audit log', { err });
      toast.error('Gagal memuat audit log');
    } finally {
      setLoading(false);
    }
  }, [page, from, to, actorFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: ColumnDef<AuditEntry>[] = [
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <SortableHeader column={column}>Waktu</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {new Date(row.original.createdAt).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Aksi',
      cell: ({ row }) => (
        <Badge className={`text-xs whitespace-nowrap ${actionColor(row.original.action)}`}>
          {row.original.action.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'actor',
      header: 'Pelaku',
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">{row.original.actor?.fullName ?? '—'}</div>
          <div className="text-xs text-gray-400">{row.original.actor?.email}</div>
        </div>
      ),
    },
    {
      id: 'subject',
      header: 'Subjek',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.subject ? (
            <>
              <div className="font-medium">{row.original.subject.fullName}</div>
              <div className="text-xs text-gray-400">{row.original.subject.email}</div>
            </>
          ) : (
            <div className="text-xs text-gray-400">
              {row.original.entityType && (
                <span className="font-mono">{row.original.entityType}</span>
              )}
              {row.original.entityId && (
                <span className="ml-1 text-gray-300">#{row.original.entityId.slice(0, 8)}</span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Alasan',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 italic line-clamp-2 max-w-xs">
          {row.original.reason ?? '—'}
        </span>
      ),
    },
    {
      id: 'ip',
      header: 'IP',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-gray-400">
          {row.original.ipAddress ?? '—'}
        </span>
      ),
    },
  ];

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Audit Log
            {total > 0 && (
              <span className="ml-2 text-base font-normal text-gray-400">({total})</span>
            )}
          </h1>
          <p className="text-sm text-gray-500">Rekam jejak semua aktivitas sistem</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">Dari:</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="w-40 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">Sampai:</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="w-40 h-9 text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setFrom(''); setTo(''); setActorFilter(''); setPage(1); }}
        >
          Reset Filter
        </Button>
      </div>

      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm overflow-x-auto">
        {loading ? (
          <SkeletonTable rows={8} columns={6} />
        ) : (
          <DataTable
            columns={columns}
            data={entries}
            searchKey="action"
            searchPlaceholder="Cari aksi..."
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
