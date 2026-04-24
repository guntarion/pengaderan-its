'use client';

/**
 * /admin/notifications/logs — Notification delivery log viewer
 * Roles: SC, SUPERADMIN
 */

import { useEffect, useState, useCallback } from 'react';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin-notifications-logs-page');

interface NotificationLog {
  id: string;
  userId: string;
  templateKey: string;
  channel: string;
  category: string;
  status: string;
  retryCount: number;
  criticalOverride: boolean;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  createdAt: string;
  user: { fullName: string; nrp: string | null };
}

const statusColor = (s: string) => {
  switch (s) {
    case 'DELIVERED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'SENT': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'FAILED': case 'BOUNCED': case 'COMPLAINED': return 'bg-red-100 text-red-800 border-red-300';
    case 'SKIPPED_USER_OPTOUT': case 'SKIPPED_NO_SUBSCRIPTION': case 'SKIPPED_BOUNCE_COOLDOWN':
      return 'bg-gray-100 text-gray-600 border-gray-300';
    case 'ESCALATED_INSTEAD_OF_SEND': return 'bg-amber-100 text-amber-800 border-amber-300';
    default: return 'bg-gray-100 text-gray-600 border-gray-300';
  }
};

const channelColor = (c: string) => {
  switch (c) {
    case 'PUSH': return 'bg-violet-100 text-violet-800 border-violet-300';
    case 'EMAIL': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'WHATSAPP': return 'bg-green-100 text-green-800 border-green-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

interface LogsResponse {
  data: NotificationLog[];
  meta: { pagination: { page: number; limit: number; total: number; totalPages: number } };
}

export default function NotificationLogsPage() {
  const [logsData, setLogsData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      log.info('Fetching notification logs', { page });
      const res = await fetch(`/api/notifications/admin/logs?page=${page}&limit=20`);
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json() as LogsResponse;
      setLogsData(json);
    } catch (err) {
      log.error('Failed to fetch logs', { err });
      toast.error('Gagal memuat log notifikasi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/notifications/admin/logs/export');
      if (!res.ok) {
        toast.error('Gagal mengekspor log');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notification-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Log berhasil diunduh');
    } catch (err) {
      log.error('Failed to export logs', { err });
      toast.error('Gagal mengekspor log');
    } finally {
      setExporting(false);
    }
  }

  const columns: ColumnDef<NotificationLog>[] = [
    {
      id: 'user',
      header: 'Pengguna',
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {row.original.user.fullName}
          </div>
          {row.original.user.nrp && (
            <div className="text-xs text-gray-500">{row.original.user.nrp}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'templateKey',
      header: ({ column }) => <SortableHeader column={column}>Template</SortableHeader>,
      cell: ({ row }) => (
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">
          {row.original.templateKey}
        </code>
      ),
    },
    {
      accessorKey: 'channel',
      header: 'Channel',
      cell: ({ row }) => (
        <Badge className={`text-xs border ${channelColor(row.original.channel)}`}>
          {row.original.channel}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Badge className={`text-xs border ${statusColor(row.original.status)}`}>
            {row.original.status.replace(/_/g, ' ')}
          </Badge>
          {row.original.criticalOverride && (
            <Badge className="text-xs border bg-red-50 text-red-700 border-red-300">
              CRITICAL
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'timing',
      header: 'Waktu',
      cell: ({ row }) => (
        <div className="text-xs text-gray-500">
          <div>{new Date(row.original.createdAt).toLocaleString('id-ID', {
            dateStyle: 'short', timeStyle: 'short',
          })}</div>
          {row.original.retryCount > 0 && (
            <div className="text-amber-600">Retry: {row.original.retryCount}x</div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DynamicBreadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Log Pengiriman</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Riwayat pengiriman notifikasi ke semua pengguna
            {logsData && (
              <span className="ml-2 text-gray-400">({logsData.meta.pagination.total} entri)</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={handleExport}
        >
          <Download className="h-4 w-4 mr-1" />
          {exporting ? 'Mengekspor...' : 'Export CSV'}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={10} />
      ) : (
        <DataTable
          columns={columns}
          data={logsData?.data ?? []}
          searchKey="templateKey"
          searchPlaceholder="Cari template key..."
        />
      )}
    </div>
  );
}
