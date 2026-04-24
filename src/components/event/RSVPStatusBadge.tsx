/**
 * src/components/event/RSVPStatusBadge.tsx
 * Badge showing RSVP status for a Kegiatan Instance.
 */

import React from 'react';

type RSVPStatus = 'CONFIRMED' | 'WAITLIST' | 'DECLINED' | null;

interface RSVPStatusBadgeProps {
  status: RSVPStatus;
  className?: string;
}

export function RSVPStatusBadge({ status, className = '' }: RSVPStatusBadgeProps) {
  if (!status) return null;

  const config = {
    CONFIRMED: {
      label: 'Terdaftar',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    },
    WAITLIST: {
      label: 'Antrean',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    },
    DECLINED: {
      label: 'Batal',
      className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
    },
  };

  const { label, className: colorClass } = config[status];

  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${colorClass} ${className}`}>
      {label}
    </span>
  );
}
