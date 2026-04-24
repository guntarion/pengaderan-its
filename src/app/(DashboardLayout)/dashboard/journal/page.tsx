'use client';

/**
 * src/app/(DashboardLayout)/dashboard/journal/page.tsx
 * NAWASENA M04 — Maba journal list page.
 *
 * Shows all submitted journals with week number, status, word count, date, and score.
 * "Tulis Jurnal Minggu Ini" button navigates to /dashboard/journal/new.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { type ColumnDef } from '@tanstack/react-table';
import { BookOpen, PlusCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonTable } from '@/components/shared/skeletons';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

interface JournalRow {
  id: string;
  weekNumber: number;
  status: string;
  wordCount: number;
  submittedAt: string;
  isLate: boolean;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'SUBMITTED':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full font-medium">
          <CheckCircle className="h-3 w-3" />
          Tepat Waktu
        </span>
      );
    case 'LATE':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded-full font-medium">
          <Clock className="h-3 w-3" />
          Terlambat
        </span>
      );
    case 'MISSED':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-600 px-2.5 py-0.5 bg-red-100 dark:bg-red-900/30 rounded-full font-medium">
          <XCircle className="h-3 w-3" />
          Tidak Dikumpulkan
        </span>
      );
    default:
      return (
        <span className="text-xs text-gray-500 px-2.5 py-0.5 bg-gray-100 rounded-full">
          {status}
        </span>
      );
  }
}

const columns: ColumnDef<JournalRow>[] = [
  {
    accessorKey: 'weekNumber',
    header: ({ column }) => <SortableHeader column={column}>Minggu</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-medium text-sky-600 dark:text-sky-400">
        Minggu {row.original.weekNumber}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'wordCount',
    header: ({ column }) => <SortableHeader column={column}>Kata</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm text-gray-600 dark:text-gray-400">{row.original.wordCount}</span>
    ),
  },
  {
    accessorKey: 'submittedAt',
    header: ({ column }) => <SortableHeader column={column}>Tanggal Kirim</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {new Date(row.original.submittedAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Link
        href={`/dashboard/journal/${row.original.weekNumber}`}
        className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
      >
        Lihat
      </Link>
    ),
  },
];

export default function JournalListPage() {
  const { data: session } = useSession();
  const [journals, setJournals] = useState<JournalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cohortId = (session?.user as { currentCohortId?: string })?.currentCohortId ?? '';

  useEffect(() => {
    if (!cohortId) return;

    async function fetchJournals() {
      try {
        const res = await fetch(`/api/journal?cohortId=${encodeURIComponent(cohortId)}`);
        if (res.ok) {
          const { data } = await res.json();
          setJournals(data ?? []);
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchJournals();
  }, [cohortId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="text-white/80 hover:text-white text-lg">&larr;</Link>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <h1 className="text-xl font-bold">Jurnal Mingguan</h1>
            </div>
          </div>
          <p className="text-white/80 text-sm ml-8">Refleksi pengalaman pengaderanmu setiap minggu.</p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
        <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />

        {/* Action button */}
        <div className="flex justify-end">
          <Link
            href="/dashboard/journal/new"
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium py-2.5 px-5 text-sm transition-colors shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            Tulis Jurnal Minggu Ini
          </Link>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
          <ErrorBoundary>
            {isLoading ? (
              <SkeletonTable rows={5} columns={5} />
            ) : (
              <DataTable
                columns={columns}
                data={journals}
                searchKey="weekNumber"
                searchPlaceholder="Cari minggu..."
              />
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
