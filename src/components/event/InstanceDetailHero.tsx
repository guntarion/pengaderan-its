/**
 * src/components/event/InstanceDetailHero.tsx
 * Hero section for Maba instance detail page.
 * Gradient header with title, kegiatan name, and status.
 */

import React from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from 'lucide-react';

interface InstanceDetailHeroProps {
  title: string;
  kegiatanNama: string;
  kegiatanId: string;
  status: 'PLANNED' | 'RUNNING' | 'DONE' | 'CANCELLED';
}

const statusLabel = {
  PLANNED: 'Akan Datang',
  RUNNING: 'Sedang Berlangsung',
  DONE: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

const statusClass = {
  PLANNED: 'bg-white/20 text-white',
  RUNNING: 'bg-green-400/30 text-white',
  DONE: 'bg-white/10 text-white/80',
  CANCELLED: 'bg-red-400/30 text-white',
};

export function InstanceDetailHero({ title, kegiatanNama, kegiatanId, status }: InstanceDetailHeroProps) {
  return (
    <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
      <div className="container mx-auto max-w-3xl">
        <Link
          href="/dashboard/kegiatan"
          className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-4 transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Kembali ke daftar kegiatan
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-white/70 mb-1">
              <Link href={`/kegiatan/${kegiatanId}`} className="hover:text-white transition-colors">
                {kegiatanNama}
              </Link>
            </p>
            <h1 className="text-xl font-bold">{title}</h1>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusClass[status]}`}>
            {statusLabel[status]}
          </span>
        </div>
      </div>
    </div>
  );
}
