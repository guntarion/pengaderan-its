/**
 * src/components/kegiatan/KegiatanCard.tsx
 * Card component for a single Kegiatan in the catalog grid.
 * Shows key taxonomy badges + tujuan/KPI counts.
 */

import React from 'react';
import Link from 'next/link';
import { TaxonomyBadge } from './TaxonomyBadge';

interface KegiatanCardProps {
  kegiatan: {
    id: string;
    nama: string;
    deskripsiSingkat: string;
    nilai: string;
    dimensi: string;
    fase: string;
    kategori: string;
    intensity: string;
    scale: string;
    durasiMenit: number;
    isGlobal: boolean;
    _count: { tujuan: number; kpiDefs: number };
  };
}

function formatDurasi(menit: number): string {
  if (menit < 60) return `${menit} mnt`;
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;
  return sisa > 0 ? `${jam}j ${sisa}m` : `${jam} jam`;
}

export function KegiatanCard({ kegiatan }: KegiatanCardProps) {
  return (
    <Link
      href={`/kegiatan/${kegiatan.id}`}
      className="group block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-sky-100 dark:border-sky-900 p-5 hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded-lg">
          {kegiatan.id}
        </span>
        {!kegiatan.isGlobal && (
          <span className="text-xs text-gray-400 dark:text-gray-500 italic">org-spesifik</span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 group-hover:text-sky-700 dark:group-hover:text-sky-300 line-clamp-2 mb-2 transition-colors">
        {kegiatan.nama}
      </h3>

      {/* Description */}
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
        {kegiatan.deskripsiSingkat}
      </p>

      {/* Taxonomy badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <TaxonomyBadge value={kegiatan.fase} variant="fase" />
        <TaxonomyBadge value={kegiatan.nilai} variant="nilai" />
        <TaxonomyBadge value={kegiatan.dimensi} variant="dimensi" />
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{kegiatan._count.tujuan} tujuan</span>
          <span>{kegiatan._count.kpiDefs} KPI</span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDurasi(kegiatan.durasiMenit)}</span>
      </div>
    </Link>
  );
}
