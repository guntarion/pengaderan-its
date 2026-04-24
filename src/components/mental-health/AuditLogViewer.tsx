'use client';

/**
 * src/components/mental-health/AuditLogViewer.tsx
 * NAWASENA M11 — Superadmin MH audit log viewer.
 *
 * Filter form + paginated DataTable of MHAccessLog entries.
 * Every query to the API also creates an AUDIT_REVIEW log entry.
 *
 * PRIVACY-CRITICAL: Only SUPERADMIN can access this data.
 */

import React, { useState, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Search } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetUserId: string | null;
  organizationId: string | null;
  reason: string | null;
  ipHash: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogResponse {
  success: boolean;
  data: AuditLogEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const MH_ACTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'READ_META', label: 'READ_META' },
  { value: 'DECRYPT_ANSWERS', label: 'DECRYPT_ANSWERS' },
  { value: 'DECRYPT_NOTE', label: 'DECRYPT_NOTE' },
  { value: 'STATUS_CHANGE', label: 'STATUS_CHANGE' },
  { value: 'EXPORT_AGGREGATE', label: 'EXPORT_AGGREGATE' },
  { value: 'BYPASS_RLS', label: 'BYPASS_RLS' },
  { value: 'DATA_DELETED', label: 'DATA_DELETED' },
  { value: 'AUDIT_REVIEW', label: 'AUDIT_REVIEW' },
];

const columns: ColumnDef<AuditLogEntry>[] = [
  {
    accessorKey: 'actorId',
    header: ({ column }) => <SortableHeader column={column}>Aktor ID</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
        {row.original.actorId.slice(0, 12)}...
      </span>
    ),
  },
  {
    accessorKey: 'actorRole',
    header: 'Role',
    cell: ({ row }) => (
      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
        {row.original.actorRole}
      </span>
    ),
  },
  {
    accessorKey: 'action',
    header: 'Aksi',
    cell: ({ row }) => (
      <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
        row.original.action === 'DECRYPT_ANSWERS' || row.original.action === 'BYPASS_RLS'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          : row.original.action === 'DECRYPT_NOTE'
            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      }`}>
        {row.original.action}
      </span>
    ),
  },
  {
    accessorKey: 'targetType',
    header: 'Target',
    cell: ({ row }) => (
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {row.original.targetType}
        {row.original.targetId ? ` (${row.original.targetId.slice(0, 8)})` : ''}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <SortableHeader column={column}>Waktu</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {format(new Date(row.original.createdAt), 'dd MMM yyyy HH:mm', { locale: idLocale })}
      </span>
    ),
  },
];

export function AuditLogViewer() {
  const [filters, setFilters] = useState({
    actorId: '',
    targetUserId: '',
    action: '',
    dateFrom: '',
    dateTo: '',
  });
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState<AuditLogResponse['meta'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchAuditLog = useCallback(async (pageNum = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.actorId) params.set('actorId', filters.actorId);
      if (filters.targetUserId) params.set('targetUserId', filters.targetUserId);
      if (filters.action) params.set('action', filters.action);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      params.set('page', String(pageNum));
      params.set('limit', '50');

      const res = await fetch(`/api/mental-health/superadmin/audit-log?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        return;
      }
      const json = (await res.json()) as AuditLogResponse;
      setEntries(json.data ?? []);
      setMeta(json.meta ?? null);
      setPage(pageNum);
    } catch {
      toast.error('Gagal memuat audit log');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchAuditLog(1);
  }

  return (
    <div className="space-y-6">
      {/* Filter form */}
      <form onSubmit={handleSearch} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Filter Audit Log</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600 dark:text-gray-400">Aktor ID</Label>
            <Input
              value={filters.actorId}
              onChange={(e) => setFilters((f) => ({ ...f, actorId: e.target.value }))}
              placeholder="User ID aktor..."
              className="rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600 dark:text-gray-400">Target User ID</Label>
            <Input
              value={filters.targetUserId}
              onChange={(e) => setFilters((f) => ({ ...f, targetUserId: e.target.value }))}
              placeholder="Target user ID..."
              className="rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600 dark:text-gray-400">Aksi</Label>
            <Select value={filters.action} onValueChange={(v) => setFilters((f) => ({ ...f, action: v === '_all' ? '' : v }))}>
              <SelectTrigger className="rounded-xl text-sm">
                <SelectValue placeholder="Semua Aksi" />
              </SelectTrigger>
              <SelectContent>
                {MH_ACTIONS.map((a) => (
                  <SelectItem key={a.value || '_all'} value={a.value || '_all'}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600 dark:text-gray-400">Dari Tanggal</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600 dark:text-gray-400">Sampai Tanggal</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="rounded-xl text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
            >
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? 'Mencari...' : 'Cari'}
            </Button>
          </div>
        </div>
      </form>

      {/* Results */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
            Hasil Audit Log
          </h2>
          {meta && (
            <span className="text-xs text-gray-400">
              {meta.total} entri total · Halaman {meta.page}/{meta.totalPages}
            </span>
          )}
        </div>

        {isLoading ? (
          <SkeletonCard />
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
            Gunakan filter di atas untuk mencari audit log.
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={entries}
              searchKey="action"
              searchPlaceholder="Filter aksi..."
            />
            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => fetchAuditLog(page - 1)}
                  className="rounded-xl"
                >
                  Sebelumnya
                </Button>
                <span className="text-sm text-gray-500 flex items-center px-3">
                  {page} / {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => fetchAuditLog(page + 1)}
                  className="rounded-xl"
                >
                  Berikutnya
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AuditLogViewer;
