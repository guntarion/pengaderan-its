/**
 * src/components/event/InstanceCard.tsx
 * Card component for a single Kegiatan Instance in the Maba listing.
 * Uses data shape from getListingForMaba service.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CalendarIcon, MapPinIcon, UsersIcon } from 'lucide-react';
import { RSVPStatusBadge } from './RSVPStatusBadge';

interface InstanceCardProps {
  instance: {
    id: string;
    scheduledAt: Date | string;
    locationDisplay: string;
    capacity: number | null;
    status: 'PLANNED' | 'RUNNING' | 'DONE' | 'CANCELLED';
    kegiatan: {
      id: string;
      nama: string;
      fase: string;
      kategori: string;
    };
    confirmedCount: number;
    myRsvp: { status: 'CONFIRMED' | 'WAITLIST' | 'DECLINED' } | null;
  };
}

const statusConfig = {
  PLANNED: { label: 'Akan Datang', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  RUNNING: { label: 'Berlangsung', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  DONE: { label: 'Selesai', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  CANCELLED: { label: 'Dibatalkan', className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

export function InstanceCard({ instance }: InstanceCardProps) {
  const { label: statusLabel, className: statusClass } = statusConfig[instance.status];
  const scheduledDate = new Date(instance.scheduledAt);
  const rsvpStatus = instance.myRsvp?.status ?? null;

  return (
    <Link
      href={`/dashboard/kegiatan/${instance.id}`}
      className="group block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-sky-100 dark:border-sky-900 p-5 hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all duration-200"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusClass}`}>
          {statusLabel}
        </span>
        <RSVPStatusBadge status={rsvpStatus} />
      </div>

      {/* Title (kegiatan name) */}
      <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 group-hover:text-sky-700 dark:group-hover:text-sky-300 line-clamp-2 mb-3 transition-colors">
        {instance.kegiatan.nama}
      </h3>

      {/* Meta info */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{format(scheduledDate, "EEEE, d MMMM yyyy 'pukul' HH:mm", { locale: localeId })}</span>
        </div>
        {instance.locationDisplay && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{instance.locationDisplay}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <UsersIcon className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            {instance.confirmedCount} peserta
            {instance.capacity ? ` / ${instance.capacity} kapasitas` : ''}
          </span>
        </div>
      </div>

      {/* Fase badge */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Fase {instance.kegiatan.fase} · {instance.kegiatan.kategori}
        </span>
      </div>
    </Link>
  );
}
