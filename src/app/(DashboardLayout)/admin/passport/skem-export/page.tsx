'use client';

/**
 * src/app/(DashboardLayout)/admin/passport/skem-export/page.tsx
 * NAWASENA M05 — SKEM CSV export page for SC.
 */

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkemExportPreview } from '@/components/admin-passport/SkemExportPreview';

export default function SkemExportPage() {
  const { data: session } = useSession();
  const cohortId = (session?.user as { currentCohortId?: string })?.currentCohortId ?? '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin/passport" className="text-white/80 hover:text-white text-sm">
              &larr; Admin Passport
            </Link>
          </div>
          <h1 className="text-xl font-bold">Export SKEM CSV</h1>
          <p className="text-sm text-sky-100 mt-1">
            Generate file CSV rekap poin SKEM untuk SIM ITS
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-5">
        <DynamicBreadcrumb />

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <span className="font-semibold">Perhatian:</span> Export ini hanya mencakup item passport
            yang sudah <span className="font-medium">VERIFIED</span>. Pastikan verifikasi sudah selesai
            sebelum upload ke SIM SKEM ITS. Setiap export tercatat dalam audit log.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          {cohortId ? (
            <SkemExportPreview cohortId={cohortId} />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Cohort ID tidak terdeteksi. Hubungi admin sistem.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
