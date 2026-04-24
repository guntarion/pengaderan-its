/**
 * src/app/(WebsiteLayout)/kegiatan/[id]/page.tsx
 * Public detail page for a single kegiatan.
 * Server component with ISR + generateStaticParams for active kegiatan.
 */

import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/utils/prisma';
import { getKegiatanDetail } from '@/lib/master-data/services/kegiatan.service';
import { KegiatanDetailHero } from '@/components/kegiatan/KegiatanDetailHero';
import { KegiatanTujuanList } from '@/components/kegiatan/KegiatanTujuanList';
import { KegiatanKPITable } from '@/components/kegiatan/KegiatanKPITable';
import { KegiatanAnchorList } from '@/components/kegiatan/KegiatanAnchorList';
import { KegiatanPassportRelated } from '@/components/kegiatan/KegiatanPassportRelated';
import { KegiatanPrasyaratLink } from '@/components/kegiatan/KegiatanPrasyaratLink';
import { MarkdownRender } from '@/components/shared/MarkdownRender';

export const revalidate = 3600; // 1 hour ISR

/** Pre-render all active global kegiatan at build time. */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const kegiatan = await prisma.kegiatan.findMany({
      where: { isActive: true, isGlobal: true },
      select: { id: true },
    });
    return kegiatan.map((k) => ({ id: k.id }));
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const kegiatan = await getKegiatanDetail(id, null);

  if (!kegiatan) {
    return { title: 'Kegiatan Tidak Ditemukan' };
  }

  return {
    title: `${kegiatan.id} — ${kegiatan.nama}`,
    description: kegiatan.deskripsiSingkat,
    openGraph: {
      title: `${kegiatan.id} — ${kegiatan.nama}`,
      description: kegiatan.deskripsiSingkat,
      type: 'article',
    },
  };
}

export default async function KegiatanDetailPage({ params }: PageProps) {
  const { id } = await params;

  const kegiatan = await getKegiatanDetail(id, null);

  if (!kegiatan) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Hero */}
      <KegiatanDetailHero kegiatan={kegiatan} />

      {/* Back link */}
      <div className="container mx-auto max-w-5xl px-4 pt-6">
        <Link
          href="/kegiatan"
          className="inline-flex items-center gap-1.5 text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Katalog
        </Link>
      </div>

      {/* Content sections */}
      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-5">
        {/* Full description */}
        {kegiatan.deskripsiFull && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Deskripsi Lengkap</h2>
            <MarkdownRender content={kegiatan.deskripsiFull} />
          </div>
        )}

        {/* Rasional */}
        {kegiatan.rasional && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Rasional</h2>
            <MarkdownRender content={kegiatan.rasional} />
          </div>
        )}

        {/* Learning objectives */}
        <KegiatanTujuanList tujuan={kegiatan.tujuan} />

        {/* KPI definitions */}
        <KegiatanKPITable kpiDefs={kegiatan.kpiDefs} />

        {/* Anchor concepts */}
        <KegiatanAnchorList anchors={kegiatan.anchors} />

        {/* Passport items */}
        <KegiatanPassportRelated passportItems={kegiatan.passportItems} />

        {/* Safeguard notes */}
        {kegiatan.safeguardNotes && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-5">
            <h2 className="font-semibold text-amber-800 dark:text-amber-300 mb-3">
              Catatan Safeguard
            </h2>
            <MarkdownRender content={kegiatan.safeguardNotes} className="text-amber-900 dark:text-amber-200" />
          </div>
        )}

        {/* Prerequisites */}
        <KegiatanPrasyaratLink prasyaratIds={kegiatan.prasyaratIds} />
      </div>
    </div>
  );
}
