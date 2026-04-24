'use client';

/**
 * src/app/(DashboardLayout)/dashboard/triwulan/archive/page.tsx
 * NAWASENA M14 — Archive: list of finalized triwulan reviews.
 * Accessible by SC, Pembina, BLM, SUPERADMIN.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ReviewStatusBadge } from '@/components/triwulan/ReviewStatusBadge';
import { PDFDownloadButton } from '@/components/triwulan/PDFDownloadButton';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Archive, FileText, CheckCircle2 } from 'lucide-react';
import { ReviewStatus, PDFStatus, TriwulanEscalationLevel } from '@prisma/client';

const log = createLogger('m14/archive/list');
const QUARTER_LABELS = ['', 'Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV'];

interface ArchiveItem {
  id: string;
  quarterNumber: number;
  status: ReviewStatus;
  escalationLevel: TriwulanEscalationLevel;
  pdfStatus: PDFStatus;
  pdfStorageKey: string | null;
  generatedAt: string | null;
  blmAcknowledgedAt: string | null;
  cohort: { id: string; code: string; name: string };
}

export default function ArchiveListPage() {
  const [reviews, setReviews] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArchive() {
      setLoading(true);
      try {
        log.info('Fetching archive list');
        const res = await fetch('/api/triwulan/archive');
        if (!res.ok) {
          const data = await res.json();
          toast.apiError(data);
          return;
        }
        const data = await res.json();
        setReviews(data.data ?? []);
      } catch (err) {
        toast.apiError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchArchive();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            className="text-white/70 mb-3 text-sm"
          />
          <div className="flex items-center gap-3">
            <Archive className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-bold">Arsip Review Triwulan</h1>
              <p className="text-sm text-white/70">
                Review yang telah diakui BLM dan difinalisasi
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} className="h-24" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900">
            <CheckCircle2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belum ada review yang diarsipkan.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                        {QUARTER_LABELS[r.quarterNumber]} — {r.cohort.code}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{r.cohort.name}</p>
                      {r.blmAcknowledgedAt && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Diakui:{' '}
                          {new Date(r.blmAcknowledgedAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <ReviewStatusBadge status={r.status} />
                    <PDFDownloadButton reviewId={r.id} initialPdfStatus={r.pdfStatus} />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-slate-700/50">
                  <span className="text-xs text-gray-400">Review ID: {r.id.slice(-8)}</span>
                  <Link
                    href={`/dashboard/triwulan/archive/${r.id}`}
                    className="text-xs text-sky-500 hover:text-sky-600 font-medium"
                  >
                    Lihat Detail
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
