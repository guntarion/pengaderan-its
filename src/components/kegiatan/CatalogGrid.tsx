/**
 * src/components/kegiatan/CatalogGrid.tsx
 * Grid display for the kegiatan catalog list.
 */

import React from 'react';
import { KegiatanCard } from './KegiatanCard';
import { BookOpen } from 'lucide-react';

interface CatalogGridProps {
  items: Array<{
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
  }>;
}

export function CatalogGrid({ items }: CatalogGridProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-sky-200 dark:border-sky-800 p-12 text-center">
        <BookOpen className="h-12 w-12 mx-auto text-sky-300 dark:text-sky-700 mb-4" />
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Tidak ada kegiatan ditemukan
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Coba ubah atau hapus filter yang aktif.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Menampilkan <span className="font-semibold text-gray-700 dark:text-gray-300">{items.length}</span> kegiatan
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((kegiatan) => (
          <KegiatanCard key={kegiatan.id} kegiatan={kegiatan} />
        ))}
      </div>
    </div>
  );
}
