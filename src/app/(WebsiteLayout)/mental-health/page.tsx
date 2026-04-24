/**
 * src/app/(WebsiteLayout)/mental-health/page.tsx
 * NAWASENA M11 — Public mental health hub page.
 *
 * No auth required. No user data. Safe for public.
 * Links to sub-pages: self-care, help-seeking, faq, hotlines.
 */

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart, Phone, HelpCircle, BookOpen, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Kesehatan Mental — ITS',
  description: 'Sumber daya kesehatan mental untuk mahasiswa ITS. Temukan tips perawatan diri, cara mencari bantuan, dan kontak darurat.',
  openGraph: {
    title: 'Kesehatan Mental — ITS',
    description: 'Sumber daya kesehatan mental untuk mahasiswa ITS.',
    type: 'website',
  },
};

const resources = [
  {
    href: '/mental-health/self-care',
    icon: Heart,
    title: 'Perawatan Diri',
    description: 'Tips sehari-hari untuk menjaga kesehatan mental dan teknik relaksasi yang mudah dipraktikkan.',
    color: 'from-teal-500 to-emerald-600',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    border: 'border-teal-100 dark:border-teal-900',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    href: '/mental-health/help-seeking',
    icon: Phone,
    title: 'Cara Mencari Bantuan',
    description: 'Langkah-langkah menghubungi SAC ITS, layanan konseling, dan apa yang terjadi setelah Anda melapor.',
    color: 'from-sky-500 to-blue-600',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-100 dark:border-sky-900',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    href: '/mental-health/faq',
    icon: HelpCircle,
    title: 'FAQ Anti-Stigma',
    description: 'Jawaban atas pertanyaan umum tentang skrining kesehatan mental, privasi data, dan mitos yang sering beredar.',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-100 dark:border-violet-900',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    href: '/mental-health/help-seeking#hotlines',
    icon: BookOpen,
    title: 'Kontak Darurat',
    description: 'Hotline 24 jam, kontak SAC ITS, dan Poli Psikologi untuk situasi yang memerlukan bantuan segera.',
    color: 'from-rose-500 to-red-600',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-100 dark:border-rose-900',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
];

export default function MentalHealthHubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Hero */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-16 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold mb-4">Kesehatan Mental</h1>
          <p className="text-lg text-white/90 leading-relaxed">
            Sumber daya untuk mendukung perjalanan kesehatan mental Anda selama masa kaderisasi.
            Informasi ini tersedia untuk semua mahasiswa tanpa memerlukan akun.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {resources.map((res) => {
            const Icon = res.icon;
            return (
              <Link
                key={res.href}
                href={res.href}
                className={`block rounded-2xl border ${res.border} ${res.bg} p-5 hover:shadow-md transition-shadow group`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${res.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      {res.title}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {res.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Important note */}
        <div className="mt-8 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
            Halaman ini tidak mengumpulkan data pribadi. Untuk mengikuti skrining kesehatan mental
            atau menghubungi SAC, masuk ke akun NAWASENA Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
