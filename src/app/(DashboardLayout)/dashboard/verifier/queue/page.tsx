'use client';

/**
 * src/app/(DashboardLayout)/dashboard/verifier/queue/page.tsx
 * NAWASENA M05 — Verifier review queue with polling badge count.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { QueueTable, type QueueEntry } from '@/components/verifier/QueueTable';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function VerifierQueuePage() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    if (!session) return;
    async function fetchQueue() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/verifier/queue');
        if (res.ok) {
          const { data } = await res.json();
          // Transform to QueueEntry shape
          const transformed: QueueEntry[] = (data ?? []).map((e: {
            id: string;
            item: { namaItem: string; dimensi: string };
            evidenceType: string;
            status: string;
            submittedAt: string;
            user: { fullName: string; nrp?: string | null };
            mabaNotes?: string | null;
          }) => ({
            id: e.id,
            itemName: e.item.namaItem,
            dimensi: e.item.dimensi,
            evidenceType: e.evidenceType,
            status: e.status,
            submittedAt: e.submittedAt,
            mabaName: e.user.fullName,
            mabaNrp: e.user.nrp ?? null,
            mabaNotes: e.mabaNotes ?? null,
            waitingDays: Math.floor(
              (Date.now() - new Date(e.submittedAt).getTime()) / 86400000,
            ),
          }));
          setEntries(transformed);
          setLastRefreshed(new Date());
        }
      } catch {
        // Silent
      } finally {
        setIsLoading(false);
      }
    }
    fetchQueue();
  }, [session]);

  const pendingCount = entries.filter((e) => e.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="text-white/80 hover:text-white text-sm">
              &larr; Dashboard
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Antrian Verifikasi</h1>
              <p className="text-sm text-sky-100 mt-1">
                {pendingCount > 0
                  ? `${pendingCount} pengajuan menunggu reviewmu`
                  : 'Semua pengajuan sudah ditangani'}
              </p>
            </div>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-5">
        <DynamicBreadcrumb />

        <ErrorBoundary>
          {isLoading ? (
            <SkeletonCard />
          ) : entries.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-8 text-center">
              <p className="text-2xl mb-2">✓</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Antrian kosong!
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tidak ada pengajuan yang perlu direview saat ini.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Terakhir diperbarui:{' '}
                {lastRefreshed.toLocaleTimeString('id-ID')}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
              <QueueTable entries={entries} />
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}
