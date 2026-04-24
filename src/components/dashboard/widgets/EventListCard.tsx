/**
 * src/components/dashboard/widgets/EventListCard.tsx
 * Upcoming events list widget.
 */

'use client';

import React from 'react';
import { CalendarIcon } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import type { WidgetState, UpcomingEvent } from '@/types/dashboard';

// Re-export for ease
export type { UpcomingEvent };

interface EventListCardProps {
  state: WidgetState<UpcomingEvent[]>;
  className?: string;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function getRSVPBadge(status?: string): string {
  switch (status) {
    case 'ACCEPTED': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    case 'DECLINED': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    case 'MAYBE': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  }
}

function EventListCardInner({ state, className = '' }: EventListCardProps) {
  if (state.status === 'loading') {
    return (
      <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded" />)}
        </div>
      </div>
    );
  }

  const events = state.status === 'data' || state.status === 'partial'
    ? (state.data as UpcomingEvent[] | undefined) ?? []
    : [];

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <CalendarIcon className="h-4 w-4 text-sky-500" />
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kegiatan Mendatang</p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="h-6 w-6" />}
          title="Tidak ada kegiatan dalam 7 hari"
        />
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-sky-50 dark:border-slate-700 p-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                {event.title}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-400">
                  {formatDate(event.startTime)} · {formatTime(event.startTime)}
                </p>
                {event.rsvpStatus && (
                  <span className={`text-xs rounded-full px-2 py-0.5 ${getRSVPBadge(event.rsvpStatus)}`}>
                    {event.rsvpStatus}
                  </span>
                )}
              </div>
              {event.location && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{event.location}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EventListCard(props: EventListCardProps) {
  return (
    <WidgetErrorBoundary widgetName="EventListCard">
      <EventListCardInner {...props} />
    </WidgetErrorBoundary>
  );
}
