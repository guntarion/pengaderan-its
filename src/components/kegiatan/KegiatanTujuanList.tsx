/**
 * src/components/kegiatan/KegiatanTujuanList.tsx
 * List of learning objectives (tujuan pembelajaran) for a kegiatan.
 */

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Tujuan {
  id: string;
  text: string;
  ordinal: number;
}

interface KegiatanTujuanListProps {
  tujuan: Tujuan[];
}

export function KegiatanTujuanList({ tujuan }: KegiatanTujuanListProps) {
  if (tujuan.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
      <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-sky-500" />
        Tujuan Pembelajaran ({tujuan.length})
      </h2>
      <ol className="space-y-3">
        {tujuan
          .sort((a, b) => a.ordinal - b.ordinal)
          .map((t, idx) => (
            <li key={t.id} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-bold mt-0.5">
                {idx + 1}
              </span>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{t.text}</p>
              </div>
            </li>
          ))}
      </ol>
    </div>
  );
}
