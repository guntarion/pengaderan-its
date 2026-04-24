'use client';

/**
 * src/components/anon-report/AccessLogTimeline.tsx
 * NAWASENA M12 — Chronological audit log timeline for report detail pages.
 *
 * SUPERADMIN: sees all entries.
 * BLM/Satgas: sees only coordination-relevant entries:
 *   READ, STATUS_CHANGE, ESCALATE, PUBLIC_NOTE_ADDED
 *
 * PRIVACY: actorId is shown (BLM/Satgas user IDs), but no reporter info.
 */

import { AnonAccessAction } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export interface AccessLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  action: AnonAccessAction;
  meta: Record<string, unknown> | null;
  createdAt: string | Date;
}

interface AccessLogTimelineProps {
  entries: AccessLogEntry[];
  userRole: string;
}

const ACTION_LABELS: Partial<Record<AnonAccessAction, string>> = {
  READ: 'Dibaca',
  UPDATE: 'Diperbarui',
  DOWNLOAD_ATTACHMENT: 'Unduh Lampiran',
  ESCALATE: 'Diteruskan ke Satgas',
  STATUS_CHANGE: 'Status Diubah',
  SEVERITY_OVERRIDE: 'Tingkat Diubah',
  CATEGORY_OVERRIDE: 'Kategori Diubah',
  PUBLIC_NOTE_ADDED: 'Catatan Publik Ditambahkan',
  INTERNAL_NOTE_ADDED: 'Catatan Internal Ditambahkan',
  TAKEOVER_FROM_DEACTIVATED: 'Diambil Alih',
  BULK_DELETE: 'Dihapus (Bulk)',
  BYPASS_RLS: 'Akses Bypass RLS',
};

const ACTION_COLORS: Partial<Record<AnonAccessAction, string>> = {
  READ: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DOWNLOAD_ATTACHMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  ESCALATE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  STATUS_CHANGE: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  SEVERITY_OVERRIDE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  CATEGORY_OVERRIDE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  PUBLIC_NOTE_ADDED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  INTERNAL_NOTE_ADDED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  BULK_DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

/** Actions visible to BLM/Satgas (coordination-relevant only) */
const COORDINATION_ACTIONS = new Set<AnonAccessAction>([
  'READ',
  'STATUS_CHANGE',
  'ESCALATE',
  'PUBLIC_NOTE_ADDED',
]);

function isSuperAdmin(role: string): boolean {
  return role === 'SUPERADMIN';
}

export function AccessLogTimeline({ entries, userRole }: AccessLogTimelineProps) {
  const filtered = isSuperAdmin(userRole)
    ? entries
    : entries.filter((e) => COORDINATION_ACTIONS.has(e.action));

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Belum ada riwayat akses.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!isSuperAdmin(userRole) && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Menampilkan entri koordinasi saja. SUPERADMIN melihat semua entri.
        </p>
      )}

      <div className="relative space-y-0">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-100 dark:bg-gray-800" />

        {filtered.map((entry, idx) => {
          const createdAt =
            entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt);
          const actionColor =
            ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
          const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;

          return (
            <div key={entry.id} className={`relative flex gap-4 py-3 pl-10 ${idx > 0 ? '' : ''}`}>
              {/* Dot */}
              <div className="absolute left-3 top-4 h-2.5 w-2.5 rounded-full border-2 border-white bg-sky-400 dark:border-gray-900" />

              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${actionColor}`}
                  >
                    {actionLabel}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    oleh {entry.actorRole} ({entry.actorId.slice(0, 8)}...)
                  </span>
                  <span
                    className="text-xs text-gray-400 dark:text-gray-500"
                    title={createdAt.toLocaleString('id-ID')}
                  >
                    {formatDistanceToNow(createdAt, { addSuffix: true, locale: localeId })}
                  </span>
                </div>

                {/* Meta summary for UPDATE actions */}
                {entry.action === 'UPDATE' && entry.meta && (
                  <div className="rounded-lg bg-gray-50 p-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {entry.meta.before != null && (
                      <span>
                        Sebelum:{' '}
                        {typeof entry.meta.before === 'object'
                          ? JSON.stringify(entry.meta.before)
                          : String(entry.meta.before as string | number | boolean)}
                        {' → '}
                      </span>
                    )}
                    {entry.meta.after != null && (
                      <span>
                        Sesudah:{' '}
                        {typeof entry.meta.after === 'object'
                          ? JSON.stringify(entry.meta.after)
                          : String(entry.meta.after as string | number | boolean)}
                      </span>
                    )}
                  </div>
                )}

                {/* DOWNLOAD_ATTACHMENT shows key prefix */}
                {entry.action === 'DOWNLOAD_ATTACHMENT' && entry.meta?.key != null && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Kunci: {String(entry.meta.key as string).slice(0, 30)}...
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
