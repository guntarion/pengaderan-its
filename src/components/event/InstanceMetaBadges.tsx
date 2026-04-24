/**
 * src/components/event/InstanceMetaBadges.tsx
 * Meta badges row for Instance detail: date, location, capacity, fase, kategori.
 */

import React from 'react';
import { CalendarIcon, MapPinIcon, UsersIcon, ClockIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface InstanceMetaBadgesProps {
  scheduledAt: string;
  executedAt?: string | null;
  location: string | null;
  capacity: number | null;
  rsvpCount: number;
  fase: string;
  kategori: string;
  durasiMenit?: number | null;
}

export function InstanceMetaBadges({
  scheduledAt,
  executedAt,
  location,
  capacity,
  rsvpCount,
  fase,
  kategori,
  durasiMenit,
}: InstanceMetaBadgesProps) {
  const dateToShow = executedAt ?? scheduledAt;

  return (
    <div className="flex flex-wrap gap-2">
      <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 px-3 py-1.5 rounded-xl">
        <CalendarIcon className="h-3.5 w-3.5" />
        {format(new Date(dateToShow), "d MMM yyyy, HH:mm", { locale: localeId })}
      </span>

      {location && (
        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 px-3 py-1.5 rounded-xl">
          <MapPinIcon className="h-3.5 w-3.5" />
          {location}
        </span>
      )}

      <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 px-3 py-1.5 rounded-xl">
        <UsersIcon className="h-3.5 w-3.5" />
        {rsvpCount} terdaftar{capacity ? ` / ${capacity}` : ''}
      </span>

      {durasiMenit && (
        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 px-3 py-1.5 rounded-xl">
          <ClockIcon className="h-3.5 w-3.5" />
          {durasiMenit < 60 ? `${durasiMenit} mnt` : `${Math.floor(durasiMenit / 60)} jam`}
        </span>
      )}

      <span className="text-xs text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 px-3 py-1.5 rounded-xl font-medium">
        Fase {fase}
      </span>

      <span className="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-xl">
        {kategori}
      </span>
    </div>
  );
}
