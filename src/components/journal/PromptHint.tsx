/**
 * src/components/journal/PromptHint.tsx
 * NAWASENA M04 — Weekly journal prompt card.
 *
 * Shows the Gibbs Reflective Cycle prompt for the current week's journal.
 * Uses the project's sky-blue/indigo theme.
 */

'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

interface PromptHintProps {
  weekNumber: number;
}

export function PromptHint({ weekNumber }: PromptHintProps) {
  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            Jurnal Refleksi — Minggu ke-{weekNumber}
          </p>
          <div className="space-y-1.5 text-sm text-blue-700 dark:text-blue-300">
            <p>
              <span className="font-medium">Apa yang terjadi?</span>{' '}
              Ceritakan pengalaman yang paling berkesan minggu ini — momen positif maupun
              tantangan yang kamu hadapi selama pengaderan.
            </p>
            <p>
              <span className="font-medium">So what?</span>{' '}
              Apa makna dari pengalaman tersebut? Pelajaran apa yang kamu petik? Bagaimana hal itu
              mempengaruhi cara berpikirmu tentang diri sendiri, orang lain, atau proses ini?
            </p>
            <p>
              <span className="font-medium">Now what?</span>{' '}
              Apa yang akan kamu lakukan berbeda ke depannya? Langkah konkret apa yang ingin kamu
              ambil berdasarkan refleksi ini?
            </p>
          </div>
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
            Minimum 300 kata di semua bagian.
          </p>
        </div>
      </div>
    </div>
  );
}
