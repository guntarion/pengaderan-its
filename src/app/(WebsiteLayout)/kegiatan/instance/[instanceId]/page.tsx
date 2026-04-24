/**
 * src/app/(WebsiteLayout)/kegiatan/instance/[instanceId]/page.tsx
 * Public instance detail page — no auth required.
 * Shows instance info + CTA to sign in.
 */

import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicInstanceDetail } from '@/lib/event/services/instance.service';
import { PublicInstanceHero } from '@/components/event/PublicInstanceHero';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ instanceId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { instanceId } = await params;
  const instance = await getPublicInstanceDetail(instanceId);

  if (!instance) {
    return { title: 'Sesi Tidak Ditemukan' };
  }

  return {
    title: `${instance.kegiatan?.nama ?? 'Sesi Kegiatan'} — NAWASENA`,
    description: `Sesi kegiatan ${instance.kegiatan?.nama ?? ''}`,
    openGraph: {
      title: instance.kegiatan?.nama ?? 'Sesi Kegiatan',
      description: `Sesi kegiatan ${instance.kegiatan?.nama ?? ''}`,
    },
  };
}

export default async function PublicInstancePage({ params }: PageProps) {
  const { instanceId } = await params;
  const instance = await getPublicInstanceDetail(instanceId);

  if (!instance) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      <PublicInstanceHero
        kegiatanNama={instance.kegiatan?.nama ?? 'Sesi Kegiatan'}
        kegiatanId={instance.kegiatan?.id ?? ''}
        scheduledAt={instance.scheduledAt}
        locationDisplay={instance.locationDisplay}
      />

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Info card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Tentang Sesi Ini</h2>
          {instance.kegiatan?.deskripsiSingkat ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">{instance.kegiatan.deskripsiSingkat}</p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">Deskripsi belum tersedia.</p>
          )}
        </div>

        {/* Eligibility note */}
        <div className="p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-2xl text-sm text-sky-700 dark:text-sky-400">
          Kegiatan ini merupakan bagian dari program orientasi mahasiswa baru NAWASENA ITS.
          Pendaftaran memerlukan akun NAWASENA yang terdaftar.
        </div>
      </div>
    </div>
  );
}
