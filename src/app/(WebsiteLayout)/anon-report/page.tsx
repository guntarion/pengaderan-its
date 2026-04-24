/**
 * src/app/(WebsiteLayout)/anon-report/page.tsx
 * NAWASENA M12 — Anonymous report landing page.
 *
 * Public, no auth. Explains the channel and links to form.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, MessageSquare, Eye, ArrowRight } from 'lucide-react';
import { AnonymityNotice } from '@/components/anon-report/AnonymityNotice';

export const metadata: Metadata = {
  title: 'Laporan Anonim — NAWASENA',
  description:
    'Sampaikan laporan perundungan, pelecehan, atau ketidakadilan secara anonim. Identitas Anda terlindungi.',
};

const steps = [
  {
    step: '1',
    title: 'Isi formulir',
    description: 'Pilih kohort, kategori, dan ceritakan situasi yang Anda alami.',
    icon: MessageSquare,
  },
  {
    step: '2',
    title: 'Simpan kode laporan',
    description: 'Anda mendapat kode unik NW-XXXXXXXX untuk melacak status laporan.',
    icon: Shield,
  },
  {
    step: '3',
    title: 'Pantau perkembangan',
    description: 'Gunakan kode untuk melihat apakah laporan sedang ditinjau atau sudah selesai.',
    icon: Eye,
  },
];

export default function AnonReportLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-blue-50 to-sky-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Laporan Anonim NAWASENA
          </h1>
          <p className="mt-3 text-base text-gray-600 dark:text-gray-400">
            Sampaikan laporan perundungan, pelecehan, atau ketidakadilan tanpa perlu mengungkap identitas.
            Sistem ini dirancang untuk melindungi anonimitas Anda sepenuhnya.
          </p>
        </div>

        {/* Anonymity guarantee */}
        <div className="mb-8">
          <AnonymityNotice />
        </div>

        {/* How it works */}
        <div className="mb-8 rounded-2xl border border-sky-100 bg-white p-6 dark:border-sky-900 dark:bg-gray-900">
          <h2 className="mb-5 text-base font-bold text-gray-900 dark:text-gray-100">
            Cara Kerja
          </h2>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.step} className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/40">
                  <step.icon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
                      {step.step}
                    </span>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/anon-report/form"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4 text-sm font-semibold text-white hover:from-sky-600 hover:to-blue-700"
          >
            <MessageSquare className="h-5 w-5" />
            Buat Laporan Baru
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/anon-status"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-6 py-4 text-sm font-semibold text-sky-600 hover:bg-sky-50 dark:border-sky-800 dark:bg-gray-900 dark:text-sky-400 dark:hover:bg-gray-800"
          >
            <Eye className="h-5 w-5" />
            Cek Status Laporan
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Punya pertanyaan? Baca{' '}
          <Link href="/anon-report/faq" className="text-sky-600 hover:underline dark:text-sky-400">
            FAQ Laporan Anonim
          </Link>
        </p>
      </div>
    </div>
  );
}
