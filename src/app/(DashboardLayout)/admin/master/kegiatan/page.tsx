/**
 * src/app/(DashboardLayout)/admin/master/kegiatan/page.tsx
 * Admin page for managing Kegiatan (toggle active, display order).
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/utils/prisma';
import { KegiatanAdminTable } from '@/components/admin/master/KegiatanAdminTable';

export const metadata: Metadata = {
  title: 'Admin Kegiatan — Master Data NAWASENA',
};

export default async function AdminKegiatanPage() {
  const kegiatan = await prisma.kegiatan.findMany({
    orderBy: [{ fase: 'asc' }, { displayOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      nama: true,
      fase: true,
      nilai: true,
      kategori: true,
      isActive: true,
      isGlobal: true,
      displayOrder: true,
      organizationId: true,
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <Link href="/admin/master" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Master Data
          </Link>
          <h1 className="text-xl font-bold">Manajemen Kegiatan</h1>
          <p className="text-white/80 text-sm mt-1">{kegiatan.length} kegiatan — toggle aktif atau edit display order</p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-5 text-sm text-amber-800 dark:text-amber-300">
          Edit konten kegiatan (nama, deskripsi, KPI) hanya via CSV update + seed apply. Gunakan halaman ini untuk toggle aktif/nonaktif saja.
        </div>
        <KegiatanAdminTable data={kegiatan} />
      </div>
    </div>
  );
}
