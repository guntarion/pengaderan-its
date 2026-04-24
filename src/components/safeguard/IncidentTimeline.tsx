'use client';

/**
 * src/components/safeguard/IncidentTimeline.tsx
 * NAWASENA M10 — Chronological timeline of incident events.
 *
 * Shows all timeline entries with icon per action, actor + timestamp.
 * Filter tabs: All / Actions / Notes / System
 */

import { useState } from 'react';
import { TimelineAction } from '@prisma/client';
import {
  Clock,
  FileText,
  CheckCircle2,
  UserCheck,
  StickyNote,
  Paperclip,
  Download,
  Shield,
  ArrowUpRight,
  RotateCcw,
  XCircle,
  Slash,
  MessageSquare,
} from 'lucide-react';

export interface TimelineEntry {
  id: string;
  action: TimelineAction;
  actorId: string;
  noteText?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  createdAt: string;
  actor?: { fullName: string; displayName?: string | null };
}

type FilterTab = 'ALL' | 'ACTIONS' | 'NOTES' | 'SYSTEM';

const ACTION_ICONS: Record<TimelineAction, React.ComponentType<{ className?: string }>> = {
  CREATED: FileText,
  STATUS_CHANGED: Clock,
  CLAIMED_FOR_REVIEW: UserCheck,
  FIELD_UPDATED: FileText,
  NOTE_ADDED: StickyNote,
  ATTACHMENT_ADDED: Paperclip,
  ATTACHMENT_DOWNLOADED: Download,
  CONSEQUENCE_ASSIGNED: Shield,
  ESCALATED_TO_SATGAS: ArrowUpRight,
  SATGAS_PDF_GENERATED: FileText,
  RESOLVED: CheckCircle2,
  REOPENED: RotateCcw,
  RETRACTED_BY_REPORTER: XCircle,
  RETRACTED_BY_SC: XCircle,
  SUPERSEDED: Slash,
  PEMBINA_ANNOTATION_ADDED: MessageSquare,
};

const ACTION_COLORS: Partial<Record<TimelineAction, string>> = {
  CREATED: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20',
  CLAIMED_FOR_REVIEW: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  RESOLVED: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  ESCALATED_TO_SATGAS: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  RETRACTED_BY_REPORTER: 'text-gray-500 bg-gray-50 dark:bg-gray-800',
  RETRACTED_BY_SC: 'text-gray-500 bg-gray-50 dark:bg-gray-800',
  NOTE_ADDED: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  PEMBINA_ANNOTATION_ADDED: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20',
  ATTACHMENT_ADDED: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20',
};

const ACTION_LABELS: Record<TimelineAction, string> = {
  CREATED: 'Insiden dilaporkan',
  STATUS_CHANGED: 'Status diubah',
  CLAIMED_FOR_REVIEW: 'Di-claim untuk review',
  FIELD_UPDATED: 'Field diperbarui',
  NOTE_ADDED: 'Catatan ditambahkan',
  ATTACHMENT_ADDED: 'Lampiran ditambahkan',
  ATTACHMENT_DOWNLOADED: 'Lampiran diunduh',
  CONSEQUENCE_ASSIGNED: 'Konsekuensi di-assign',
  ESCALATED_TO_SATGAS: 'Diekskalasi ke Satgas',
  SATGAS_PDF_GENERATED: 'PDF Satgas digenerate',
  RESOLVED: 'Insiden diselesaikan',
  REOPENED: 'Insiden dibuka kembali',
  RETRACTED_BY_REPORTER: 'Di-retract oleh reporter',
  RETRACTED_BY_SC: 'Di-retract oleh SC',
  SUPERSEDED: 'Superseded (M09 cascade)',
  PEMBINA_ANNOTATION_ADDED: 'Anotasi Pembina ditambahkan',
};

const SYSTEM_ACTIONS: TimelineAction[] = [
  'ATTACHMENT_DOWNLOADED',
  'SATGAS_PDF_GENERATED',
  'SUPERSEDED',
];

const NOTE_ACTIONS: TimelineAction[] = [
  'NOTE_ADDED',
  'PEMBINA_ANNOTATION_ADDED',
];

const ACTION_ACTIONS: TimelineAction[] = [
  'CREATED',
  'STATUS_CHANGED',
  'CLAIMED_FOR_REVIEW',
  'RESOLVED',
  'REOPENED',
  'ESCALATED_TO_SATGAS',
  'RETRACTED_BY_REPORTER',
  'RETRACTED_BY_SC',
  'SUPERSEDED',
  'CONSEQUENCE_ASSIGNED',
];

function filterByTab(entries: TimelineEntry[], tab: FilterTab): TimelineEntry[] {
  if (tab === 'ALL') return entries;
  if (tab === 'NOTES') return entries.filter((e) => NOTE_ACTIONS.includes(e.action));
  if (tab === 'ACTIONS') return entries.filter((e) => ACTION_ACTIONS.includes(e.action));
  if (tab === 'SYSTEM') return entries.filter((e) => SYSTEM_ACTIONS.includes(e.action));
  return entries;
}

interface IncidentTimelineProps {
  entries: TimelineEntry[];
  loading?: boolean;
}

export function IncidentTimeline({ entries, loading }: IncidentTimelineProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'ALL', label: `Semua (${entries.length})` },
    { id: 'ACTIONS', label: 'Aksi' },
    { id: 'NOTES', label: 'Catatan' },
    { id: 'SYSTEM', label: 'Sistem' },
  ];

  const filtered = filterByTab(entries, activeTab);

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
              activeTab === tab.id
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 text-gray-600 dark:text-gray-400 hover:border-sky-300',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline entries */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Belum ada entri timeline</p>
      ) : (
        <div className="space-y-0">
          {filtered.map((entry, idx) => {
            const Icon = ACTION_ICONS[entry.action] ?? Clock;
            const colorClass =
              ACTION_COLORS[entry.action] ??
              'text-gray-400 bg-gray-50 dark:bg-gray-800';
            const label = ACTION_LABELS[entry.action] ?? entry.action;
            const actorName =
              entry.actor?.displayName ?? entry.actor?.fullName ?? 'Sistem';
            const isLast = idx === filtered.length - 1;

            return (
              <div key={entry.id} className="flex gap-3">
                {/* Icon column + connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${colorClass}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1 mb-1" style={{ minHeight: '12px' }} />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-3 ${isLast ? '' : ''}`}>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {actorName} &bull;{' '}
                    {new Date(entry.createdAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {entry.noteText && (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-2 border border-gray-100 dark:border-gray-700">
                      {entry.noteText}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
