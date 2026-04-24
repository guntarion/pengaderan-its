/**
 * src/app/(WebsiteLayout)/kegiatan/[id]/loading.tsx
 * Loading skeleton for the kegiatan detail page.
 */

import React from 'react';
import { SkeletonText, SkeletonPageHeader } from '@/components/shared/skeletons';

export default function KegiatanDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 py-10 px-4">
        <div className="container mx-auto max-w-5xl">
          <SkeletonPageHeader />
          <div className="mt-4 h-16 bg-white/10 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Content skeletons */}
      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5"
          >
            <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-4 animate-pulse" />
            <SkeletonText lines={4} />
          </div>
        ))}
      </div>
    </div>
  );
}
