'use client';

/**
 * src/components/triwulan/ReviewStatusBadge.tsx
 * NAWASENA M14 — Displays TriwulanReview status as a colored badge.
 */

import { ReviewStatus } from '@prisma/client';

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  className?: string;
}

const STATUS_CONFIG: Record<ReviewStatus, { label: string; className: string }> = {
  [ReviewStatus.DRAFT]: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  [ReviewStatus.SUBMITTED_FOR_PEMBINA]: {
    label: 'Menunggu Pembina',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  [ReviewStatus.PEMBINA_SIGNED]: {
    label: 'Pembina Tanda Tangan',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  [ReviewStatus.BLM_ACKNOWLEDGED]: {
    label: 'BLM Diakui',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  [ReviewStatus.FINALIZED]: {
    label: 'Final',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 font-semibold',
  },
  [ReviewStatus.ARCHIVED_BY_REGENERATE]: {
    label: 'Diarsipkan',
    className: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  },
};

export function ReviewStatusBadge({ status, className = '' }: ReviewStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
