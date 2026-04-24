/**
 * src/app/(WebsiteLayout)/kegiatan/loading.tsx
 * Loading skeleton for the kegiatan catalog page.
 */

import React from 'react';
import { SkeletonCardGrid, SkeletonPageHeader } from '@/components/shared/skeletons';

export default function KegiatanCatalogLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header skeleton */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <SkeletonPageHeader />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter skeleton */}
          <aside className="lg:w-64 shrink-0">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 h-72 animate-pulse" />
          </aside>
          {/* Grid skeleton */}
          <main className="flex-1">
            <SkeletonCardGrid count={9} />
          </main>
        </div>
      </div>
    </div>
  );
}
