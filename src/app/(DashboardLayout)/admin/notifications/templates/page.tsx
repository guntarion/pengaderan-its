'use client';

/**
 * /admin/notifications/templates — List notification templates
 * Roles: SC, SUPERADMIN
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Globe, Building2 } from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin-notifications-templates-page');

interface NotificationTemplate {
  id: string;
  templateKey: string;
  description: string;
  category: string;
  organizationId: string | null;
  supportedChannels: string[];
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  activeVersion: { id: string; version: string; publishedAt: string | null } | null;
  _count: { versions: number };
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

export default function NotificationTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      log.info('Fetching notification templates');
      const res = await fetch('/api/notifications/admin/templates?limit=100');
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setTemplates(json.data ?? []);
    } catch (err) {
      log.error('Failed to fetch templates', { err });
      toast.error('Gagal memuat template notifikasi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const columns: ColumnDef<NotificationTemplate>[] = [
    {
      accessorKey: 'templateKey',
      header: ({ column }) => <SortableHeader column={column}>Template Key</SortableHeader>,
      cell: ({ row }) => (
        <div>
          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">
            {row.original.templateKey}
          </code>
          <div className="text-xs text-gray-500 mt-0.5">{row.original.description}</div>
        </div>
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
      id: 'channels',
      header: 'Channel',
      cell: ({ row }) => (
        <div className="flex gap-1 flex-wrap">
          {row.original.supportedChannels.map((c) => (
            <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'scope',
      header: 'Cakupan',
      cell: ({ row }) => (
        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
          {row.original.organizationId === null ? (
            <><Globe className="h-3.5 w-3.5 text-violet-500" /> Global</>
          ) : (
            <><Building2 className="h-3.5 w-3.5 text-sky-500" /> Org</>
          )}
        </span>
      ),
    },
    {
      id: 'activeVersion',
      header: 'Versi Aktif',
      cell: ({ row }) => (
        row.original.activeVersion ? (
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            v{row.original.activeVersion.version}
          </span>
        ) : (
          <span className="text-xs text-red-500">Belum ada versi</span>
        )
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => router.push(`/admin/notifications/templates/${row.original.templateKey}`)}
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          Detail
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DynamicBreadcrumb />

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Template Notifikasi</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Kelola konten template notifikasi dan versi aktifnya
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={8} />
      ) : (
        <DataTable
          columns={columns}
          data={templates}
          searchKey="templateKey"
          searchPlaceholder="Cari template..."
        />
      )}
    </div>
  );
}
