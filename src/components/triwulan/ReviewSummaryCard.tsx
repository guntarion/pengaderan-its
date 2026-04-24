'use client';

/**
 * src/components/triwulan/ReviewSummaryCard.tsx
 * NAWASENA M14 — Compact summary card for a TriwulanReview in a list.
 */

import Link from 'next/link';
import { FileText, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ReviewStatusBadge } from './ReviewStatusBadge';
import { ReviewStatus, TriwulanEscalationLevel } from '@prisma/client';

interface ReviewSummaryCardProps {
  reviewId: string;
  quarterNumber: number;
  cohortCode: string;
  cohortName: string;
  status: ReviewStatus;
  escalationLevel: TriwulanEscalationLevel;
  submittedAt: string | null;
  updatedAt: string;
  hrefBase: string; // e.g. '/dashboard/sc/triwulan'
  actionLabel?: string;
}

const QUARTER_LABELS = ['', 'Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV'];

export function ReviewSummaryCard({
  reviewId,
  quarterNumber,
  cohortCode,
  cohortName,
  status,
  escalationLevel,
  submittedAt,
  updatedAt,
  hrefBase,
  actionLabel = 'Lihat Detail',
}: ReviewSummaryCardProps) {
  const isUrgent = escalationLevel === TriwulanEscalationLevel.URGENT;
  const isWarning = escalationLevel === TriwulanEscalationLevel.WARNING;

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md ${
        isUrgent
          ? 'border-red-200 dark:border-red-800'
          : isWarning
          ? 'border-amber-200 dark:border-amber-700'
          : 'border-sky-100 dark:border-sky-900'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-sky-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
              {QUARTER_LABELS[quarterNumber] ?? `Q${quarterNumber}`} — {cohortCode}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{cohortName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isUrgent && (
            <AlertTriangle className="h-4 w-4 text-red-500" aria-label="Eskalasi urgen" />
          )}
          {isWarning && !isUrgent && (
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Peringatan eskalasi" />
          )}
          <ReviewStatusBadge status={status} />
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {submittedAt ? (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Dikirim {new Date(submittedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Diperbarui {new Date(updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Action */}
      <div className="flex justify-end">
        <Link
          href={`${hrefBase}/${reviewId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-sky-500 hover:bg-sky-600 text-white transition-colors"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
