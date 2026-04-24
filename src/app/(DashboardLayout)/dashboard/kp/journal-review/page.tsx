'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kp/journal-review/page.tsx
 * NAWASENA M04 — KP Journal Review page.
 * Lists unscored journals from Maba in KP's group.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, SortableHeader } from '@/components/shared/DataTable';
import { SkeletonTable } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { ClipboardCheck, Eye } from 'lucide-react';

interface UnscoredJournal {
  id: string;
  userId: string;
  weekNumber: number;
  submittedAt: string;
  wordCount: number;
  status: string;
  userFullName: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'SUBMITTED') {
    return (
      <span className="text-xs px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full font-medium">
        Menunggu Penilaian
      </span>
    );
  }
  if (status === 'LATE') {
    return (
      <span className="text-xs px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full font-medium">
        Terlambat
      </span>
    );
  }
  return (
    <span className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full font-medium">
      {status}
    </span>
  );
}

export default function KpJournalReviewPage() {
  const router = useRouter();
  const [journals, setJournals] = useState<UnscoredJournal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJournals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/journal/unscored');
      if (!res.ok) {
        toast.apiError(await res.json().catch(() => null));
        return;
      }
      const json = await res.json();
      setJournals(json.data ?? []);
    } catch {
      toast.error('Gagal memuat daftar jurnal');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  const columns: ColumnDef<UnscoredJournal>[] = [
    {
      accessorKey: 'userFullName',
      header: ({ column }) => <SortableHeader column={column}>Nama Maba</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {row.original.userFullName}
        </span>
      ),
    },
    {
      accessorKey: 'weekNumber',
      header: ({ column }) => <SortableHeader column={column}>Minggu</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Minggu {row.original.weekNumber}
        </span>
      ),
    },
    {
      accessorKey: 'submittedAt',
      header: ({ column }) => <SortableHeader column={column}>Dikumpulkan</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(row.original.submittedAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      accessorKey: 'wordCount',
      header: 'Kata',
      cell: ({ row }) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {row.original.wordCount.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'action',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() =>
            router.push(`/dashboard/kp/journal-review/${row.original.id}`)
          }
          className="flex items-center gap-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white rounded-xl py-1.5 px-3 font-medium transition-colors"
        >
          <Eye className="h-3 w-3" />
          Nilai
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Page header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-bold">Nilai Jurnal Maba</h1>
              <p className="text-sm text-white/80 mt-0.5">
                Jurnal yang menunggu penilaian rubrik
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-4xl px-4 py-6">
        {isLoading ? (
          <SkeletonTable rows={5} columns={5} />
        ) : journals.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-10 text-center">
            <ClipboardCheck className="h-12 w-12 text-sky-200 dark:text-sky-700 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-700 dark:text-gray-300">
              Semua jurnal sudah dinilai!
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Tidak ada jurnal yang menunggu penilaian saat ini.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 overflow-hidden">
            <DataTable
              columns={columns}
              data={journals}
              searchKey="userFullName"
              searchPlaceholder="Cari nama Maba..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
