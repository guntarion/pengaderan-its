/**
 * src/app/(DashboardLayout)/admin/master/page.tsx
 * Master Data admin hub.
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Database, Tags, Zap, Activity, ClipboardList, Shield, BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Master Data — Admin NAWASENA',
};

const ADMIN_CARDS = [
  {
    title: 'Kegiatan',
    description: 'Toggle aktif/nonaktif, atur display order.',
    href: '/admin/master/kegiatan',
    icon: Activity,
    roles: 'SC, SUPERADMIN',
    color: 'text-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    border: 'border-sky-100 dark:border-sky-800',
  },
  {
    title: 'Taksonomi',
    description: 'Edit label bilingual untuk nilai, dimensi, fase, kategori.',
    href: '/admin/master/taksonomi',
    icon: Tags,
    roles: 'SUPERADMIN',
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-100 dark:border-violet-800',
  },
  {
    title: 'Seed Data',
    description: 'Preview diff dan apply data master dari CSV.',
    href: '/admin/master/seed',
    icon: Zap,
    roles: 'SUPERADMIN',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-100 dark:border-amber-800',
  },
];

const REF_LINKS = [
  { title: 'Forbidden Acts', href: '/referensi/forbidden-acts', icon: Shield },
  { title: 'Safeguard Protocol', href: '/referensi/safeguard', icon: Shield },
  { title: 'Rubrik AAC&U', href: '/referensi/rubrik', icon: BookOpen },
  { title: 'Form Inventory', href: '/referensi/form-inventory', icon: ClipboardList },
];

export default function AdminMasterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <Database className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-bold">Master Data</h1>
              <p className="text-white/80 text-sm">Kelola kegiatan, taksonomi, dan seed data.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Admin actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Aksi Admin</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ADMIN_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`group block rounded-2xl border p-5 ${card.bg} ${card.border} hover:shadow-md transition-all`}
                >
                  <div className={`mb-3 p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm inline-block`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.description}</p>
                  <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-medium">{card.roles}</div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Reference links */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Referensi (Read-only)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {REF_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900 p-3 text-sm text-gray-700 dark:text-gray-300 hover:border-sky-300 dark:hover:border-sky-700 transition-all"
                >
                  <Icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  {link.title}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
