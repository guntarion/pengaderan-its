'use client';

/**
 * src/app/(DashboardLayout)/dashboard/oc/kegiatan/new/page.tsx
 * NAWASENA M08 — Create new KegiatanInstance wizard page.
 *
 * Roles: OC, SC, SUPERADMIN
 */

import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { CreateInstanceWizard } from '@/components/event-execution/CreateInstanceWizard';
import { CalendarPlusIcon } from 'lucide-react';

export default function NewInstancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            className="text-white/70 mb-3 text-sm"
          />
          <div className="flex items-center gap-3">
            <CalendarPlusIcon className="h-6 w-6" />
            <h1 className="text-xl font-bold">Buat Sesi Kegiatan Baru</h1>
          </div>
          <p className="text-sm text-white/80 mt-1">
            Pilih kegiatan dari katalog dan jadwalkan sesi untuk angkatan kamu
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-6 shadow-sm">
          <CreateInstanceWizard />
        </div>
      </div>
    </div>
  );
}
