/**
 * src/components/journal/JournalReadView.tsx
 * NAWASENA M04 — Read-only view for a submitted journal.
 *
 * Shows submitted journal content with status badge and rubric score if present.
 */

'use client';

import React from 'react';
import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { RubricScoreBadge } from '@/components/rubric/RubricScoreBadge';

interface RubricScoreData {
  level: number;
  comment?: string | null;
}

interface JournalReadViewProps {
  journal: {
    weekNumber: number;
    whatHappened: string;
    soWhat: string;
    nowWhat: string;
    status: string;
    wordCount: number;
    submittedAt: Date | string;
    rubricScore?: RubricScoreData | null;
  };
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'SUBMITTED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full font-medium">
          <CheckCircle className="h-3 w-3" />
          Tepat Waktu
        </span>
      );
    case 'LATE':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full font-medium">
          <Clock className="h-3 w-3" />
          Terlambat
        </span>
      );
    case 'MISSED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-red-600 px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-full font-medium">
          <XCircle className="h-3 w-3" />
          Tidak Dikumpulkan
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full font-medium">
          <AlertTriangle className="h-3 w-3" />
          {status}
        </span>
      );
  }
}

export function JournalReadView({ journal }: JournalReadViewProps) {
  const submittedDate =
    journal.submittedAt instanceof Date
      ? journal.submittedAt
      : new Date(journal.submittedAt);

  return (
    <div className="space-y-6">
      {/* Header meta */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={journal.status} />
        {journal.rubricScore && (
          <RubricScoreBadge level={journal.rubricScore.level} />
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {journal.wordCount} kata
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Dikirim{' '}
          {submittedDate.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Rubric comment */}
      {journal.rubricScore?.comment && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
            Catatan KP
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {journal.rubricScore.comment}
          </p>
        </div>
      )}

      {/* Field: Apa yang terjadi */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Apa yang terjadi?
        </h3>
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {journal.whatHappened}
          </p>
        </div>
      </div>

      {/* Field: So What */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          So what?
        </h3>
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {journal.soWhat}
          </p>
        </div>
      </div>

      {/* Field: Now What */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Now what?
        </h3>
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {journal.nowWhat}
          </p>
        </div>
      </div>
    </div>
  );
}
