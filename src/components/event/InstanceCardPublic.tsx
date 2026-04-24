/**
 * src/components/event/InstanceCardPublic.tsx
 * Public-facing card for an upcoming Kegiatan Instance.
 * Shown on the public Kegiatan catalog page.
 * Uses data shape from getPublicUpcomingForKegiatan service.
 */

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CalendarIcon, MapPinIcon } from 'lucide-react';

interface InstanceCardPublicProps {
  instance: {
    id: string;
    scheduledAt: Date | string;
    locationDisplay: string;
    kegiatanNama?: string;
  };
}

export function InstanceCardPublic({ instance }: InstanceCardPublicProps) {
  const date = new Date(instance.scheduledAt);

  return (
    <Link
      href={`/kegiatan/instance/${instance.id}`}
      className="group flex flex-col gap-2 bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-4 hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all duration-200"
    >
      {instance.kegiatanNama && (
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-sky-700 dark:group-hover:text-sky-300 line-clamp-2 transition-colors">
          {instance.kegiatanNama}
        </p>
      )}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{format(date, "EEEE, d MMM yyyy 'pukul' HH:mm", { locale: localeId })}</span>
      </div>
      {instance.locationDisplay && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="line-clamp-1">{instance.locationDisplay}</span>
        </div>
      )}
      <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-1 group-hover:underline">
        Lihat detail &rarr;
      </p>
    </Link>
  );
}
