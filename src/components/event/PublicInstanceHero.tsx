/**
 * src/components/event/PublicInstanceHero.tsx
 * Hero section for the public instance detail page.
 * Gradient header with CTA to sign in.
 * Uses data shape from getPublicInstanceDetail service.
 */

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CalendarIcon, MapPinIcon, ChevronLeftIcon } from 'lucide-react';

interface PublicInstanceHeroProps {
  kegiatanNama: string;
  kegiatanId: string;
  scheduledAt: Date | string;
  locationDisplay: string;
}

export function PublicInstanceHero({
  kegiatanNama,
  kegiatanId,
  scheduledAt,
  locationDisplay,
}: PublicInstanceHeroProps) {
  const date = new Date(scheduledAt);

  return (
    <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <Link
          href={`/kegiatan/${kegiatanId}`}
          className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-5 transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {kegiatanNama}
        </Link>

        <h1 className="text-2xl font-bold mb-4">{kegiatanNama}</h1>

        <div className="flex flex-wrap gap-4 text-sm text-white/90">
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4" />
            {format(date, "EEEE, d MMMM yyyy 'pukul' HH:mm", { locale: localeId })}
          </span>
          {locationDisplay && (
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="h-4 w-4" />
              {locationDisplay}
            </span>
          )}
        </div>

        <div className="mt-6">
          <Link
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 bg-white text-sky-600 font-semibold px-6 py-3 rounded-xl hover:bg-sky-50 transition-colors shadow-md"
          >
            Daftar sebagai Maba
          </Link>
          <p className="text-xs text-white/70 mt-2">
            Diperlukan akun NAWASENA untuk mendaftar kegiatan
          </p>
        </div>
      </div>
    </div>
  );
}
