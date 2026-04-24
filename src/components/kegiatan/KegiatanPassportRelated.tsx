/**
 * src/components/kegiatan/KegiatanPassportRelated.tsx
 * Passport items related to a kegiatan.
 */

import React from 'react';
import { Award } from 'lucide-react';

interface PassportItem {
  id: string;
  dimensi: string;
  description: string;
  ordinal: number;
}

interface KegiatanPassportRelatedProps {
  passportItems: PassportItem[];
}

export function KegiatanPassportRelated({ passportItems }: KegiatanPassportRelatedProps) {
  if (passportItems.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
      <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
        <Award className="h-5 w-5 text-amber-500" />
        Passport Items ({passportItems.length})
      </h2>
      <div className="space-y-2">
        {passportItems
          .sort((a, b) => a.ordinal - b.ordinal)
          .map((item) => (
            <div
              key={item.id}
              className="flex gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800"
            >
              <span className="shrink-0 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 pt-0.5">
                {item.id}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{item.description}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
