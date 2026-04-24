/**
 * src/app/(DashboardLayout)/admin/master/seed/page.tsx
 * SUPERADMIN-only seed trigger UI.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Zap } from 'lucide-react';
import { SeedApplyButton } from '@/components/admin/master/SeedApplyButton';

export const metadata: Metadata = {
  title: 'Seed Data — Admin NAWASENA',
};

export default function AdminSeedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <Link href="/admin/master" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Master Data
          </Link>
          <div className="flex items-center gap-3">
            <Zap className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-bold">Seed Data</h1>
              <p className="text-white/80 text-sm">Preview dan apply data master dari CSV — SUPERADMIN only</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Warning */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-1">Panduan Penggunaan</p>
          <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
            <li>Selalu jalankan <strong>Preview</strong> terlebih dahulu untuk melihat perubahan</li>
            <li>Apply hanya jika diff sesuai ekspektasi</li>
            <li>Maksimal 1 apply per 5 menit</li>
            <li>Audit log akan tercatat otomatis</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <SeedApplyButton />
        </div>
      </div>
    </div>
  );
}
