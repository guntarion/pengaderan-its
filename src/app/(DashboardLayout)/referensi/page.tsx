/**
 * src/app/(DashboardLayout)/referensi/page.tsx
 * Reference hub — links to all reference sub-pages.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ShieldAlert,
  Shield,
  BarChart3,
  Tags,
  ClipboardList,
  ExternalLink,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Referensi — NAWASENA',
};

const REFERENCE_CARDS = [
  {
    title: 'Forbidden Acts',
    description: 'Daftar larangan dan konsekuensi dalam pengaderan.',
    href: '/referensi/forbidden-acts',
    icon: ShieldAlert,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-100 dark:border-red-800',
  },
  {
    title: 'Safeguard Protocol',
    description: 'Mekanisme perlindungan dan eskalasi insiden.',
    href: '/referensi/safeguard',
    icon: Shield,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-100 dark:border-emerald-800',
  },
  {
    title: 'Rubrik AAC&U',
    description: 'Rubrik penilaian kompetensi multi-level.',
    href: '/referensi/rubrik',
    icon: BarChart3,
    color: 'text-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    border: 'border-sky-100 dark:border-sky-800',
  },
  {
    title: 'Taksonomi',
    description: 'Label bilingual untuk nilai, dimensi, fase, dan kategori.',
    href: '/referensi/taksonomi',
    icon: Tags,
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-100 dark:border-violet-800',
  },
  {
    title: 'Inventori Form',
    description: 'Daftar form, pengisi, dan frekuensi pengisian.',
    href: '/referensi/form-inventory',
    icon: ClipboardList,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-100 dark:border-amber-800',
  },
  {
    title: 'Katalog Kegiatan',
    description: 'Katalog publik seluruh kegiatan pengaderan.',
    href: '/kegiatan',
    icon: ExternalLink,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-100 dark:border-blue-800',
  },
];

export default function ReferensiHubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-xl font-bold">Referensi</h1>
          <p className="text-white/80 text-sm mt-1">
            Panduan, rubrik, dan dokumen referensi pengaderan.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REFERENCE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={`group block rounded-2xl border p-5 ${card.bg} ${card.border} hover:shadow-md transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {card.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
