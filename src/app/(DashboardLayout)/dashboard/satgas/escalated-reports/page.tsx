'use client';

/**
 * /dashboard/satgas/escalated-reports
 * NAWASENA M12 — Satgas PPKPT escalated reports dashboard.
 *
 * Shows cross-org escalated reports (satgasEscalated=true).
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
import { AnonSeverity, AnonStatus } from '@prisma/client';
import { ShieldAlert } from 'lucide-react';

const log = createLogger('satgas-escalated-reports-page');

interface AnonReportRow {
  id: string;
  trackingCode: string;
  category: string;
  severity: AnonSeverity;
  status: AnonStatus;
  satgasEscalatedAt?: string | null;
  recordedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  BULLYING: 'Perundungan',
  HARASSMENT: 'Pelecehan',
  UNFAIR: 'Ketidakadilan',
  SUGGESTION: 'Saran',
  OTHER: 'Lainnya',
};

export default function SatgasEscalatedReportsPage() {
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

      const escalated = json.data.filter((r: AnonReportRow) =>
        r.status === AnonStatus.ESCALATED_TO_SATGAS,
      );

      setReports(escalated);
      log.info('Escalated reports loaded', { count: escalated.length });
    } catch (err) {
      log.error('Failed to load escalated reports', { error: err });
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
        <span className="font-mono text-xs text-gray-500">{row.original.trackingCode}</span>
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
      accessorKey: 'satgasEscalatedAt',
      header: 'Diteruskan',
      cell: ({ row }) => (
        <span className="text-xs text-gray-500">
          {row.original.satgasEscalatedAt
            ? new Date(row.original.satgasEscalatedAt).toLocaleDateString('id-ID')
            : '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/satgas/escalated-reports/${row.original.id}`}
          className="text-xs text-sky-600 hover:underline dark:text-sky-400"
        >
          Detail
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-orange-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Laporan Diteruskan ke Satgas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Laporan yang memerlukan penanganan Satgas PPKPT ITS.
          </p>
        </div>
      </div>

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
