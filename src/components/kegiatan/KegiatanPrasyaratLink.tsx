/**
 * src/components/kegiatan/KegiatanPrasyaratLink.tsx
 * Display prerequisite kegiatan as clickable links.
 */

import React from 'react';
import Link from 'next/link';
import { Link2 } from 'lucide-react';

interface KegiatanPrasyaratLinkProps {
  prasyaratIds: string[];
}

export function KegiatanPrasyaratLink({ prasyaratIds }: KegiatanPrasyaratLinkProps) {
  if (prasyaratIds.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
      <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-sky-500" />
        Prasyarat ({prasyaratIds.length})
      </h2>
      <div className="flex flex-wrap gap-2">
        {prasyaratIds.map((id) => (
          <Link
            key={id}
            href={`/kegiatan/${id}`}
            className="inline-flex items-center gap-1 text-sm font-mono font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 px-3 py-1 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
          >
            {id}
          </Link>
        ))}
      </div>
    </div>
  );
}
