'use client';

/**
 * /dashboard/blm/anon-reports
 * NAWASENA M12 — BLM triage dashboard for anonymous reports.
 *
 * Shows org-scoped reports (RLS enforced on API).
 * Masked tracking code column.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { DataTable } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { SeverityBadge } from '@/components/anon-report/SeverityBadge';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { AnonSeverity, AnonStatus } from '@prisma/client';

const log = createLogger('blm-anon-reports-page');

interface AnonReportRow {
  id: string;
  trackingCode: string;
  category: string;
  severity: AnonSeverity;
  status: AnonStatus;
  satgasEscalated: boolean;
  recordedAt: string;
}

const STATUS_LABELS: Record<AnonStatus, string> = {
  NEW: 'Baru',
  IN_REVIEW: 'Ditinjau',
  RESOLVED: 'Selesai',
  ESCALATED_TO_SATGAS: 'Diteruskan ke Satgas',
};

const CATEGORY_LABELS: Record<string, string> = {
  BULLYING: 'Perundungan',
  HARASSMENT: 'Pelecehan',
  UNFAIR: 'Ketidakadilan',
  SUGGESTION: 'Saran',
  OTHER: 'Lainnya',
};

export default function BLMAnonReportsPage() {
  const [reports, setReports] = useState<AnonReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/anon-reports?limit=100');
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Gagal memuat laporan');
      }

      setReports(json.data);
      log.info('Anon reports loaded', { count: json.data.length });
    } catch (err) {
      log.error('Failed to load anon reports', { error: err });
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const columns: ColumnDef<AnonReportRow>[] = [
    {
      accessorKey: 'trackingCode',
      header: 'Kode',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {row.original.trackingCode}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Kategori',
      cell: ({ row }) => (
        <span className="text-sm">{CATEGORY_LABELS[row.original.category] ?? row.original.category}</span>
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Tingkat',
      cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'satgasEscalated',
      header: 'Satgas',
      cell: ({ row }) =>
        row.original.satgasEscalated ? (
          <ShieldAlert className="h-4 w-4 text-orange-500" />
        ) : null,
    },
    {
      accessorKey: 'recordedAt',
      header: 'Tanggal',
      cell: ({ row }) => (
        <span className="text-xs text-gray-500">
          {new Date(row.original.recordedAt).toLocaleDateString('id-ID')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/blm/anon-reports/${row.original.id}`}
          className="text-xs text-sky-600 hover:underline dark:text-sky-400"
        >
          Detail
        </Link>
      ),
    },
  ];

  const newCount = reports.filter((r) => r.status === AnonStatus.NEW).length;
  const inReviewCount = reports.filter((r) => r.status === AnonStatus.IN_REVIEW).length;
  const escalatedCount = reports.filter((r) => r.satgasEscalated).length;

  return (
    <div className="space-y-6 p-6">
      <DynamicBreadcrumb />

      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Laporan Anonim</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Laporan dari anggota organisasi Anda.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Baru', count: newCount, icon: Clock, color: 'text-sky-600' },
          { label: 'Ditinjau', count: inReviewCount, icon: AlertTriangle, color: 'text-amber-600' },
          { label: 'Diteruskan Satgas', count: escalatedCount, icon: ShieldAlert, color: 'text-orange-600' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-white p-4 dark:border-sky-900 dark:bg-gray-900"
          >
            <stat.icon className={`h-6 w-6 ${stat.color}`} />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonCard />
      ) : (
        <div className="rounded-2xl border border-sky-100 bg-white dark:border-sky-900 dark:bg-gray-900">
          <DataTable
            columns={columns}
            data={reports}
            searchKey="trackingCode"
            searchPlaceholder="Cari kode laporan..."
          />
        </div>
      )}
    </div>
  );
}
