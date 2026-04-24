/**
 * src/components/event/NPSInsufficientDataView.tsx
 * Shown when NPS data has fewer than 5 responses (privacy threshold).
 */

import React from 'react';
import { ShieldIcon } from 'lucide-react';

interface NPSInsufficientDataViewProps {
  nResponses: number;
  minimumRequired: number;
}

export function NPSInsufficientDataView({ nResponses, minimumRequired }: NPSInsufficientDataViewProps) {
  const remaining = minimumRequired - nResponses;
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-center">
      <ShieldIcon className="h-10 w-10 text-amber-500 mx-auto mb-3" />
      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
        Data Belum Cukup
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Saat ini ada <strong>{nResponses}</strong> dari minimum{' '}
        <strong>{minimumRequired}</strong> responden yang dibutuhkan untuk
        menjaga privasi peserta.
      </p>
      <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
        Butuh <strong>{remaining}</strong> responden lagi untuk menampilkan aggregate.
      </p>
    </div>
  );
}
