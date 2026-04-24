'use client';

/**
 * /dashboard/superadmin/anon-audit
 * NAWASENA M12 — SUPERADMIN access audit log UI.
 *
 * Shows paginated AnonReportAccessLog entries with filter by action/date.
 */

import { useCallback, useEffect, useState } from 'react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { DataTable } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { ShieldCheck } from 'lucide-react';

const log = createLogger('superadmin-anon-audit-page');

interface AuditLogEntry {
  id: string;
  reportId: string;
  actorId: string;
  actorRole: string;
  action: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  READ: 'Baca',
  UPDATE: 'Ubah',
  STATUS_CHANGE: 'Ubah Status',
  ESCALATE: 'Eskalasi',
  PUBLIC_NOTE_ADDED: 'Tambah Catatan Publik',
  INTERNAL_NOTE_ADDED: 'Tambah Catatan Internal',
  DOWNLOAD_ATTACHMENT: 'Unduh Lampiran',
  BULK_DELETE: 'Hapus Massal',
  SEVERITY_OVERRIDE: 'Override Tingkat',
  CATEGORY_OVERRIDE: 'Override Kategori',
};

export default function AnonAuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterAction) params.set('action', filterAction);
      if (filterDateFrom) params.set('dateFrom', new Date(filterDateFrom).toISOString());
      if (filterDateTo) params.set('dateTo', new Date(filterDateTo + 'T23:59:59').toISOString());

      const res = await fetch(`/api/anon-reports/superadmin/audit-log?${params}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Gagal memuat audit log');
      }

      setEntries(json.data);
      log.info('Audit log loaded', { count: json.data.length });
    } catch (err) {
      log.error('Failed to load audit log', { error: err });
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterDateFrom, filterDateTo]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Waktu',
      cell: ({ row }) => (
        <span className="text-xs text-gray-500">
          {new Date(row.original.createdAt).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      accessorKey: 'actorId',
      header: 'Pelaku',
      cell: ({ row }) => (
        <div>
          <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
            {row.original.actorId.slice(0, 8)}...
          </span>
          <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
            {row.original.actorRole}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Aksi',
      cell: ({ row }) => (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {ACTION_LABELS[row.original.action] ?? row.original.action}
        </span>
      ),
    },
    {
      accessorKey: 'reportId',
      header: 'ID Laporan',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-gray-500">
          {row.original.reportId.slice(0, 8)}...
        </span>
      ),
    },
    {
      accessorKey: 'meta',
      header: 'Meta',
      cell: ({ row }) =>
        row.original.meta ? (
          <span className="text-xs text-gray-400">
            {JSON.stringify(row.original.meta).slice(0, 60)}
            {JSON.stringify(row.original.meta).length > 60 ? '...' : ''}
          </span>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-violet-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Audit Log Akses Laporan Anonim
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Rekam jejak setiap akses ke laporan anonim oleh BLM, Satgas, dan SUPERADMIN.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-sky-100 bg-white p-4 dark:border-sky-900 dark:bg-gray-900">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Aksi</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="">Semua Aksi</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Dari Tanggal</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Sampai Tanggal</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          />
        </div>

        {(filterAction || filterDateFrom || filterDateTo) && (
          <div className="flex items-end">
            <button
              onClick={() => { setFilterAction(''); setFilterDateFrom(''); setFilterDateTo(''); }}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonCard />
      ) : (
        <div className="rounded-2xl border border-sky-100 bg-white dark:border-sky-900 dark:bg-gray-900">
          <DataTable
            columns={columns}
            data={entries}
            searchKey="actorId"
            searchPlaceholder="Cari pelaku..."
          />
        </div>
      )}
    </div>
  );
}
