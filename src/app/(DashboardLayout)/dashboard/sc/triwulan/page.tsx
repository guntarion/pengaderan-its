'use client';

/**
 * src/app/(DashboardLayout)/dashboard/sc/triwulan/page.tsx
 * NAWASENA M14 — SC Triwulan Review List Page.
 *
 * Shows all reviews for the SC's cohort. Links to detail/edit and new form.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ReviewSummaryCard } from '@/components/triwulan/ReviewSummaryCard';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { FileText, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ReviewStatus, TriwulanEscalationLevel } from '@prisma/client';

const log = createLogger('m14/sc/triwulan/list');

interface ReviewItem {
  id: string;
  quarterNumber: number;
  status: ReviewStatus;
  escalationLevel: TriwulanEscalationLevel;
  submittedAt: string | null;
  updatedAt: string;
  supersededByReviewId: string | null;
  cohort: { code: string; name: string };
}

export default function SCTriwulanListPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      setLoading(true);
      try {
        log.info('Fetching SC triwulan review list');
        const res = await fetch('/api/triwulan/list');
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
    fetchReviews();
  }, []);

  const activeReviews = reviews.filter((r) => !r.supersededByReviewId);
  const supersededReviews = reviews.filter((r) => r.supersededByReviewId);

  const urgentCount = activeReviews.filter(
    (r) => r.escalationLevel === TriwulanEscalationLevel.URGENT
  ).length;

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <div>
                <h1 className="text-xl font-bold">Review Triwulan</h1>
                <p className="text-sm text-white/70">Laporan evaluasi triwulan kaderisasi</p>
              </div>
            </div>
            <Link
              href="/dashboard/sc/triwulan/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-transparent border border-white/40 text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Buat Review
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Urgent alert */}
        {urgentCount > 0 && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              <span className="font-semibold">{urgentCount} review</span> memiliki eskalasi urgen
              yang membutuhkan perhatian segera.
            </p>
          </div>
        )}

        {/* Active reviews */}
        <section>
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
            Review Aktif ({activeReviews.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} className="h-32" />
              ))}
            </div>
          ) : activeReviews.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900">
              <CheckCircle2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Belum ada review triwulan.
              </p>
              <Link
                href="/dashboard/sc/triwulan/new"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Buat Review Pertama
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeReviews.map((r) => (
                <ReviewSummaryCard
                  key={r.id}
                  reviewId={r.id}
                  quarterNumber={r.quarterNumber}
                  cohortCode={r.cohort.code}
                  cohortName={r.cohort.name}
                  status={r.status}
                  escalationLevel={r.escalationLevel}
                  submittedAt={r.submittedAt}
                  updatedAt={r.updatedAt}
                  hrefBase="/dashboard/sc/triwulan"
                />
              ))}
            </div>
          )}
        </section>

        {/* Superseded reviews */}
        {supersededReviews.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-500 mb-3 uppercase tracking-wide">
              Review Lama (Digantikan)
            </h2>
            <div className="space-y-2">
              {supersededReviews.map((r) => (
                <ReviewSummaryCard
                  key={r.id}
                  reviewId={r.id}
                  quarterNumber={r.quarterNumber}
                  cohortCode={r.cohort.code}
                  cohortName={r.cohort.name}
                  status={r.status}
                  escalationLevel={r.escalationLevel}
                  submittedAt={r.submittedAt}
                  updatedAt={r.updatedAt}
                  hrefBase="/dashboard/sc/triwulan"
                  actionLabel="Lihat Riwayat"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
