'use client';

/**
 * src/components/passport/ResubmitHistoryChain.tsx
 * NAWASENA M05 — History chain visualization for resubmit attempts.
 */

import { StatusBadge } from './StatusBadge';

interface HistoryEntry {
  id: string;
  status: string;
  submittedAt: Date | string;
  verifierNote: string | null;
  evidenceType: string;
}

interface ResubmitHistoryChainProps {
  history: HistoryEntry[];
}

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  TANDA_TANGAN: 'Tanda Tangan',
  FOTO: 'Foto',
  QR_STAMP: 'QR Scan',
  FILE: 'File',
  LOGBOOK: 'Logbook',
  ATTENDANCE: 'Absensi',
};

export function ResubmitHistoryChain({ history }: ResubmitHistoryChainProps) {
  if (history.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Riwayat Pengajuan Sebelumnya
      </h3>
      <div className="space-y-3">
        {history.map((entry, idx) => (
          <div
            key={entry.id}
            className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Percobaan #{history.length - idx}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                  {EVIDENCE_TYPE_LABELS[entry.evidenceType] ?? entry.evidenceType} ·{' '}
                  {new Date(entry.submittedAt).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <StatusBadge status={entry.status as 'REJECTED' | 'CANCELLED' | 'VERIFIED' | 'PENDING'} />
            </div>
            {entry.verifierNote && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900">
                <p className="text-xs text-red-700 dark:text-red-300">
                  <span className="font-medium">Alasan penolakan:</span> {entry.verifierNote}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
