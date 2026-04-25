'use client';

/**
 * /dashboard/safeguard/incidents
 * NAWASENA M10 — Incident list page for SC, Safeguard Officer, Pembina, OC, KP.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { DataTable } from '@/components/shared/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { IncidentStatusBadge } from '@/components/safeguard/IncidentStatusBadge';
import { SeverityLegend } from '@/components/safeguard/SeverityLegend';
import { SkeletonCard } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Plus, AlertOctagon, Clock, CheckCircle } from 'lucide-react';

const log = createLogger('safeguard-incidents-page');

interface Incident {
  id: string;
  type: string;
  severity: string;
  status: string;
  occurredAt: string;
  createdAt: string;
  reportedById: string;
  reportedByName?: string | null;
  claimedByName?: string | null;
}

interface Summary {
  openCount: number;
  inReviewCount: number;
  overdueCount: number;
}

export default function SafeguardIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [summary, setSummary] = useState<Summary>({ openCount: 0, inReviewCount: 0, overdueCount: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      const res = await fetch(`/api/safeguard/incidents?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Gagal memuat insiden');

      const data: Incident[] = json.data;
      setIncidents(data);
      setTotal(json.meta?.pagination?.total ?? data.length);

      // Calculate summary from current page
      setSummary({
        openCount: data.filter((i) => i.status === 'OPEN').length,
        inReviewCount: data.filter((i) => i.status === 'IN_REVIEW').length,
        overdueCount: 0, // TODO: calculate from backend
      });

      log.info('Incidents loaded', { count: data.length, page: p });
    } catch (err) {
      log.error('Failed to load incidents', { error: err });
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchIncidents(page);
  }, [fetchIncidents, page]);

  const TYPE_LABELS: Record<string, string> = {
    SAFE_WORD: 'Safe Word',
    MEDICAL: 'Medis',
    SHUTDOWN: 'Shutdown',
    INJURY: 'Cedera',
    CONFLICT: 'Konflik',
    HARASSMENT: 'Pelecehan',
    OTHER: 'Lainnya',
  };

  const columns: ColumnDef<Incident>[] = [
    {
      id: 'severity_status',
      header: 'Tingkat / Status',
      cell: ({ row }) => (
        <IncidentStatusBadge severity={row.original.severity} status={row.original.status} />
      ),
    },
    {
      accessorKey: 'type',
      header: 'Jenis',
      cell: ({ row }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {TYPE_LABELS[row.original.type] ?? row.original.type}
        </span>
      ),
    },
    {
      id: 'reporter',
      header: 'Reporter',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.reportedByName ?? '—'}
        </span>
      ),
    },
    {
      id: 'claimed_by',
      header: 'Ditangani oleh',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.claimedByName ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'occurredAt',
      header: 'Waktu Insiden',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(row.original.occurredAt).toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Link href={`/dashboard/safeguard/incidents/${row.original.id}`}>
          <Button variant="ghost" size="sm" className="text-xs">
            Detail
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DynamicBreadcrumb
        labels={{ safeguard: 'Safeguard', incidents: 'Daftar Insiden' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Insiden Safeguard
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pantau dan tangani insiden peserta
            </p>
            <SeverityLegend />
          </div>
        </div>
        <Link href="/dashboard/safeguard/incidents/new">
          <Button className="rounded-xl bg-sky-500 text-white hover:bg-sky-600">
            <Plus className="mr-1.5 h-4 w-4" />
            Lapor Insiden
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
          <div className="flex items-center gap-3">
            <AlertOctagon className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-xs text-orange-700 dark:text-orange-400">Terbuka</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">
                {loading ? '—' : summary.openCount}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-400">Ditangani</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                {loading ? '—' : summary.inReviewCount}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Total Halaman Ini</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">
                {loading ? '—' : incidents.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonCard className="h-64" />
      ) : (
        <div className="rounded-2xl border border-sky-100 bg-white dark:border-sky-900 dark:bg-gray-900">
          <DataTable
            columns={columns}
            data={incidents}
            pageSizes={[20, 50]}
            searchKey="type"
            searchPlaceholder="Filter jenis insiden..."
          />
          {/* Server-side pagination controls */}
          <div className="flex items-center justify-between border-t border-sky-100 px-4 py-3 dark:border-sky-900">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total: {total} insiden
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs"
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={incidents.length < 20}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs"
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
