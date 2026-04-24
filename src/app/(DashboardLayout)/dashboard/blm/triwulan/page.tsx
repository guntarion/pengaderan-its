'use client';

/**
 * src/app/(DashboardLayout)/dashboard/blm/triwulan/page.tsx
 * NAWASENA M14 — BLM: List of reviews awaiting acknowledgement.
 */

import { useState, useEffect } from 'react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ReviewSummaryCard } from '@/components/triwulan/ReviewSummaryCard';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ReviewStatus, TriwulanEscalationLevel } from '@prisma/client';

const log = createLogger('m14/blm/triwulan/list');

interface ReviewItem {
  id: string;
  quarterNumber: number;
  status: ReviewStatus;
  escalationLevel: TriwulanEscalationLevel;
  submittedAt: string | null;
  updatedAt: string;
  cohort: { code: string; name: string };
}

export default function BLMTriwulanListPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      setLoading(true);
      try {
        log.info('Fetching reviews awaiting BLM acknowledgement');
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

  const urgentCount = reviews.filter(
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
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-bold">Audit Substansi Triwulan</h1>
              <p className="text-sm text-white/70">
                Review yang siap diaudit dan diakui BLM
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        {urgentCount > 0 && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              <span className="font-semibold">{urgentCount} review</span> dengan eskalasi urgen.
            </p>
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
            Menunggu Audit BLM ({reviews.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} className="h-32" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Tidak ada review yang menunggu audit
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Semua review telah diproses atau belum ada yang ditandatangani Pembina.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
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
                  hrefBase="/dashboard/blm/triwulan"
                  actionLabel="Audit Substansi"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
