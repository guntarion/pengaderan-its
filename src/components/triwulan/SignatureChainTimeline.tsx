'use client';

/**
 * src/components/triwulan/SignatureChainTimeline.tsx
 * NAWASENA M14 — Shows the signature/event chain for a review.
 */

import { CheckCircle2, Clock, FileText, Send, Pen, Eye, RefreshCw } from 'lucide-react';

interface SignatureEvent {
  id: string;
  action: string;
  actorDisplayName: string | null;
  actorFullName: string | null;
  notes: string | null;
  createdAt: string;
}

interface SignatureChainTimelineProps {
  events: SignatureEvent[];
  className?: string;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  GENERATE: {
    label: 'Review Dibuat',
    icon: FileText,
    color: 'text-sky-500',
  },
  SC_UPDATE_NARRATIVE: {
    label: 'Narasi Diperbarui (SC)',
    icon: Pen,
    color: 'text-blue-500',
  },
  SC_SUBMIT: {
    label: 'Dikirim ke Pembina',
    icon: Send,
    color: 'text-violet-500',
  },
  PEMBINA_SIGN: {
    label: 'Pembina Tanda Tangan',
    icon: CheckCircle2,
    color: 'text-emerald-500',
  },
  PEMBINA_REQUEST_REVISION: {
    label: 'Pembina Minta Revisi',
    icon: RefreshCw,
    color: 'text-amber-500',
  },
  BLM_AUDIT_ITEM_TICK: {
    label: 'BLM Isi Audit Item',
    icon: Eye,
    color: 'text-indigo-500',
  },
  BLM_ACKNOWLEDGE: {
    label: 'BLM Mengakui Review',
    icon: CheckCircle2,
    color: 'text-emerald-600',
  },
  BLM_REQUEST_REVISION: {
    label: 'BLM Minta Revisi',
    icon: RefreshCw,
    color: 'text-orange-500',
  },
};

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SignatureChainTimeline({ events, className = '' }: SignatureChainTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className={`text-sm text-gray-400 italic ${className}`}>
        Belum ada jejak tanda tangan.
      </div>
    );
  }

  return (
    <ol className={`relative border-l-2 border-sky-100 dark:border-sky-900 space-y-5 ${className}`}>
      {events.map((event, idx) => {
        const config = ACTION_CONFIG[event.action] ?? {
          label: event.action,
          icon: Clock,
          color: 'text-gray-500',
        };
        const Icon = config.icon;
        const isLast = idx === events.length - 1;

        return (
          <li key={event.id} className="ml-4">
            <span
              className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-slate-800 ring-2 ${
                isLast ? 'ring-sky-500' : 'ring-sky-200 dark:ring-sky-800'
              }`}
            >
              <Icon className={`h-2.5 w-2.5 ${config.color}`} />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {config.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {event.actorDisplayName ?? event.actorFullName ?? 'Sistem'} ·{' '}
                {formatDateTime(event.createdAt)}
              </p>
              {event.notes && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-1.5 max-w-md">
                  &ldquo;{event.notes}&rdquo;
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
