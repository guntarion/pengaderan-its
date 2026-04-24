'use client';

/**
 * src/app/(DashboardLayout)/dashboard/verifier/[entryId]/review/page.tsx
 * NAWASENA M05 — Verifier review page for a single PassportEntry.
 */

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { ReviewPanel, type ReviewEntryData } from '@/components/verifier/ReviewPanel';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function VerifierReviewPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = use(params);
  const { data: session } = useSession();
  const [entry, setEntry] = useState<ReviewEntryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    async function fetchEntry() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/passport/${entryId}`);
        if (res.ok) {
          const { data } = await res.json();
          setEntry(data);
        }
      } catch {
        // Silent
      } finally {
        setIsLoading(false);
      }
    }
    fetchEntry();
  }, [entryId, session]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="h-6 bg-white/20 rounded w-1/2 animate-pulse" />
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12 text-center text-gray-500 dark:text-gray-400">
        Pengajuan tidak ditemukan atau kamu tidak memiliki akses.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/dashboard/verifier/queue"
              className="text-white/80 hover:text-white text-sm"
            >
              &larr; Antrian
            </Link>
          </div>
          <h1 className="text-lg font-bold">Review Pengajuan</h1>
          <p className="text-sm text-sky-100 mt-1 truncate">
            {entry.item.namaItem} — {entry.user.fullName}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        <DynamicBreadcrumb />

        <ErrorBoundary>
          <ReviewPanel entry={entry} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
