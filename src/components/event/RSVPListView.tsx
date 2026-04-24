/**
 * src/components/event/RSVPListView.tsx
 * Scoped RSVP list for Maba: shows only confirmed attendee names.
 * Uses data shape from getRSVPListScoped service (Maba view).
 */

'use client';

import React from 'react';
import { UsersIcon } from 'lucide-react';

interface RSVPEntry {
  id: string;
  status: 'CONFIRMED' | 'WAITLIST' | 'DECLINED';
  userName: string;
}

interface RSVPListViewProps {
  confirmed: RSVPEntry[];
  total: number;
  isLoading?: boolean;
}

export function RSVPListView({ confirmed, total, isLoading }: RSVPListViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (confirmed.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
        Belum ada peserta yang terdaftar.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
        <UsersIcon className="h-3.5 w-3.5" />
        {total} peserta terdaftar
      </p>
      {confirmed.map((rsvp) => (
        <div
          key={rsvp.id}
          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 py-1.5 px-3 rounded-xl bg-gray-50 dark:bg-slate-700/50"
        >
          <div className="h-6 w-6 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-xs font-medium text-sky-600 dark:text-sky-400 flex-shrink-0">
            {rsvp.userName.charAt(0).toUpperCase()}
          </div>
          <span>{rsvp.userName}</span>
        </div>
      ))}
    </div>
  );
}
