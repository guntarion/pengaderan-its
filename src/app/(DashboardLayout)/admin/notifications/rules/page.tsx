'use client';

/**
 * /admin/notifications/rules — List notification rules
 * Roles: SC, SUPERADMIN
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Globe, Building2, Pencil } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';

const log = createLogger('admin-notifications-rules-page');

interface NotificationRule {
  id: string;
  name: string;
  templateKey: string;
  cronExpression: string;
  category: string;
  channels: string[];
  active: boolean;
  isGlobal: boolean;
  organizationId: string | null;
  lastExecutedAt: string | null;
  createdAt: string;
  createdBy: { fullName: string } | null;
  _count: { executions: number };
}

const categoryColor = (c: string) => {
  switch (c) {
    case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
    case 'FORM_REMINDER': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'NORMAL': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'OPS': return 'bg-violet-100 text-violet-800 border-violet-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function NotificationRulesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null);

  const canManage = user?.role === 'SC' || user?.role === 'SUPERADMIN';

  const fetchRules = useCallback(async () => {
    try {
      log.info('Fetching notification rules');
      const res = await fetch('/api/notifications/admin/rules?limit=100');
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setRules(json.data ?? []);
    } catch (err) {
      log.error('Failed to fetch rules', { err });
      toast.error('Gagal memuat aturan notifikasi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  async function handleRunNow(rule: NotificationRule) {
    const confirmed = await confirm({
      title: `Jalankan Sekarang: ${rule.name}?`,
      description: `Ini akan langsung mengirim notifikasi ke semua target sesuai aturan ini. Tindakan tidak dapat dibatalkan.`,
    });
    if (!confirmed) return;

    setRunningRuleId(rule.id);
    try {
      const res = await fetch(`/api/notifications/admin/rules/${rule.id}/run-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual trigger dari admin panel' }),
      });

      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }

      const data = await res.json();
      toast.success(
        `Eksekusi selesai: ${data.data.usersSent}/${data.data.usersTargeted} pengguna berhasil dikirim`,
      );
      fetchRules();
    } catch (err) {
      log.error('Failed to run rule', { err, ruleId: rule.id });
      toast.error('Gagal menjalankan aturan');
    } finally {
      setRunningRuleId(null);
    }
  }

  const columns: ColumnDef<NotificationRule>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>Nama Aturan</SortableHeader>,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{row.original.name}</div>
          <div className="text-xs text-gray-500 font-mono mt-0.5">{row.original.templateKey}</div>
        </div>
      ),
    },
    {
      accessorKey: 'cronExpression',
      header: 'Jadwal',
      cell: ({ row }) => (
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
          {row.original.cronExpression}
        </code>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Kategori',
      cell: ({ row }) => (
        <Badge className={`text-xs border ${categoryColor(row.original.category)}`}>
          {row.original.category}
        </Badge>
      ),
    },
    {
      id: 'scope',
      header: 'Cakupan',
      cell: ({ row }) => (
        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
          {row.original.isGlobal ? (
            <><Globe className="h-3.5 w-3.5 text-violet-500" /> Global</>
          ) : (
            <><Building2 className="h-3.5 w-3.5 text-sky-500" /> Org</>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={row.original.active
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 text-xs border'
          : 'bg-gray-100 text-gray-500 border-gray-300 text-xs border'
        }>
          {row.original.active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      id: 'lastRun',
      header: 'Terakhir Jalan',
      cell: ({ row }) => (
        <span className="text-xs text-gray-500">
          {row.original.lastExecutedAt
            ? new Date(row.original.lastExecutedAt).toLocaleString('id-ID', {
                dateStyle: 'short', timeStyle: 'short',
              })
            : 'Belum pernah'
          }
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          {canManage && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => router.push(`/admin/notifications/rules/${row.original.id}`)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Detail
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-xs bg-sky-500 hover:bg-sky-600 text-white"
                disabled={runningRuleId === row.original.id}
                onClick={() => handleRunNow(row.original)}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                {runningRuleId === row.original.id ? 'Berjalan...' : 'Jalankan'}
              </Button>
            </>
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Aturan Notifikasi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kelola aturan notifikasi berkala dan jadwal cron
          </p>
        </div>
        {canManage && (
          <Button
            className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
            onClick={() => router.push('/admin/notifications/rules/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Aturan Baru
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <DataTable
          columns={columns}
          data={rules}
          searchKey="name"
          searchPlaceholder="Cari aturan..."
        />
      )}

      <ConfirmDialog />
    </div>
  );
}
