/**
 * src/components/event/NPSAlreadySubmittedView.tsx
 * View shown when the user has already submitted NPS for an instance.
 */

import React from 'react';
import Link from 'next/link';
import { CheckCircleIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface NPSAlreadySubmittedViewProps {
  submission: {
    npsScore: number;
    feltSafe: number;
    meaningful: number;
    recordedAt: string;
  };
  instanceId: string;
}

export function NPSAlreadySubmittedView({ submission, instanceId }: NPSAlreadySubmittedViewProps) {
  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 text-center">
        <CheckCircleIcon className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
          Feedback sudah dikirim
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Dikirim pada{' '}
          {format(new Date(submission.recordedAt), "d MMMM yyyy 'pukul' HH:mm", { locale: localeId })}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Ringkasan feedback kamu:</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{submission.npsScore}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Kepuasan (0-10)</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{submission.feltSafe}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Keamanan (1-5)</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{submission.meaningful}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Kebermaknaan (1-5)</p>
          </div>
        </div>
      </div>

      <Link
        href={`/dashboard/kegiatan/${instanceId}`}
        className="block text-center text-sm text-sky-600 dark:text-sky-400 hover:underline"
      >
        Kembali ke detail kegiatan
      </Link>
    </div>
  );
}
