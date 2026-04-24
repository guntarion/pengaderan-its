/**
 * src/components/kegiatan/KegiatanDetailHero.tsx
 * Hero section for the kegiatan detail page.
 */

import React from 'react';
import { TaxonomyBadge } from './TaxonomyBadge';
import { Clock, Target, BarChart2, Layers } from 'lucide-react';

interface KegiatanDetailHeroProps {
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
    frekuensi: string;
    isGlobal: boolean;
  };
}

function formatDurasi(menit: number): string {
  if (menit < 60) return `${menit} menit`;
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;
  return sisa > 0 ? `${jam} jam ${sisa} menit` : `${jam} jam`;
}

export function KegiatanDetailHero({ kegiatan }: KegiatanDetailHeroProps) {
  return (
    <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
      <div className="container mx-auto max-w-5xl px-4 py-10">
        {/* ID Badge + Fase */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="font-mono text-sm font-bold bg-white/20 px-3 py-1 rounded-lg">
            {kegiatan.id}
          </span>
          <TaxonomyBadge
            value={kegiatan.fase}
            variant="fase"
            size="sm"
          />
          {!kegiatan.isGlobal && (
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full italic">
              org-spesifik
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold mb-3">{kegiatan.nama}</h1>

        {/* Description */}
        <p className="text-white/80 text-sm md:text-base max-w-3xl mb-6">
          {kegiatan.deskripsiSingkat}
        </p>

        {/* Taxonomy grid */}
        <div className="flex flex-wrap gap-2 mb-6">
          <TaxonomyBadge value={kegiatan.nilai} variant="nilai" size="sm" />
          <TaxonomyBadge value={kegiatan.dimensi} variant="dimensi" size="sm" />
          <TaxonomyBadge value={kegiatan.kategori} variant="kategori" size="sm" />
          <TaxonomyBadge value={kegiatan.intensity} variant="intensity" size="sm" />
          <TaxonomyBadge value={kegiatan.scale} variant="scale" size="sm" />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/10 rounded-xl p-3 flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <div>
              <div className="text-xs text-white/70">Durasi</div>
              <div className="text-sm font-semibold">{formatDurasi(kegiatan.durasiMenit)}</div>
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 flex items-center gap-2">
            <Target className="h-4 w-4 shrink-0" />
            <div>
              <div className="text-xs text-white/70">Nilai</div>
              <div className="text-sm font-semibold">{kegiatan.nilai}</div>
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 shrink-0" />
            <div>
              <div className="text-xs text-white/70">Intensitas</div>
              <div className="text-sm font-semibold capitalize">{kegiatan.intensity.toLowerCase()}</div>
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 flex items-center gap-2">
            <Layers className="h-4 w-4 shrink-0" />
            <div>
              <div className="text-xs text-white/70">Frekuensi</div>
              <div className="text-sm font-semibold">{kegiatan.frekuensi}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
