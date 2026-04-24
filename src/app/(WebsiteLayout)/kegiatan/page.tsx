/**
 * src/app/(WebsiteLayout)/kegiatan/page.tsx
 * Public catalog of kegiatan (learning activities).
 * Server component with ISR revalidation every hour.
 */

import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getCatalogKegiatan } from '@/lib/master-data/services/kegiatan.service';
import { CatalogGrid } from '@/components/kegiatan/CatalogGrid';
import { KegiatanFilter } from '@/components/kegiatan/KegiatanFilter';
import { SkeletonCardGrid } from '@/components/shared/skeletons';
import type { FaseKey, KategoriKey, NilaiKey, KegiatanIntensity, KegiatanScale } from '@prisma/client';

export const revalidate = 3600; // 1 hour ISR

export const metadata: Metadata = {
  title: 'Katalog Kegiatan Pengaderan',
  description:
    'Katalog lengkap kegiatan pengaderan mahasiswa baru — tujuan pembelajaran, KPI, dan landasan konsep.',
  openGraph: {
    title: 'Katalog Kegiatan Pengaderan',
    description: 'Katalog lengkap kegiatan pengaderan mahasiswa baru.',
    type: 'website',
  },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseArrayParam(val: string | string[] | undefined): string[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val;
  return val.split(',').filter(Boolean);
}

export default async function KegiatanPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const fase = parseArrayParam(params.fase) as FaseKey[] | undefined;
  const nilai = parseArrayParam(params.nilai) as NilaiKey[] | undefined;
  const kategori = parseArrayParam(params.kategori) as KategoriKey[] | undefined;
  const intensity = parseArrayParam(params.intensity) as KegiatanIntensity[] | undefined;
  const scale = parseArrayParam(params.scale) as KegiatanScale[] | undefined;

  const items = await getCatalogKegiatan(null, {
    fase,
    nilai,
    kategori,
    intensity,
    scale,
  });

  const hasFilters = fase || nilai || kategori || intensity || scale;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Page header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Katalog Kegiatan Pengaderan</h1>
          <p className="text-white/80 text-sm md:text-base max-w-2xl">
            Eksplorasi seluruh kegiatan pengaderan mahasiswa baru beserta tujuan pembelajaran, KPI,
            dan landasan konsep yang mendasarinya.
          </p>
          {hasFilters && (
            <div className="mt-3 text-sm text-white/70">
              {items.length} kegiatan ditemukan dengan filter aktif
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter sidebar */}
          <aside className="lg:w-64 shrink-0">
            <Suspense fallback={<div className="h-48 bg-white dark:bg-slate-800 rounded-2xl animate-pulse" />}>
              <KegiatanFilter />
            </Suspense>
          </aside>

          {/* Grid */}
          <main className="flex-1 min-w-0">
            <Suspense fallback={<SkeletonCardGrid count={9} />}>
              <CatalogGrid items={items} />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
