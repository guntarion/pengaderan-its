/**
 * src/app/(WebsiteLayout)/anon-report/form/page.tsx
 * NAWASENA M12 — Anonymous report form page.
 *
 * Public, no auth. Contains the submit form.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';
import { SubmitForm } from '@/components/anon-report/SubmitForm';

export const metadata: Metadata = {
  title: 'Buat Laporan Anonim — NAWASENA',
  description: 'Formulir laporan anonim NAWASENA. Identitas Anda terlindungi sepenuhnya.',
  robots: { index: false, follow: false }, // Don't index the form page
};

export default function AnonReportFormPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-blue-50 to-sky-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/anon-report"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Laporan Anonim
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Identitas Anda sepenuhnya terlindungi. Tidak ada nama, email, atau IP yang disimpan.
            </p>
          </div>
        </div>

        {/* Form container */}
        <div className="rounded-2xl border border-sky-100 bg-white p-6 dark:border-sky-900 dark:bg-gray-900">
          <SubmitForm />
        </div>
      </div>
    </div>
  );
}
