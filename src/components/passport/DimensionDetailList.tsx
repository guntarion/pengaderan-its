'use client';

/**
 * src/components/passport/DimensionDetailList.tsx
 * NAWASENA M05 — List of PassportItems within a single dimension, with status per item.
 */

import Link from 'next/link';
import { StatusBadge } from './StatusBadge';

export interface PassportItemRow {
  id: string;
  namaItem: string;
  dimensi: string;
  evidenceType: string;
  keterangan: string | null;
  entryStatus?: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'CANCELLED' | null;
  entryId?: string | null;
}

interface DimensionDetailListProps {
  items: PassportItemRow[];
  dimensiLabel: string;
}

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  TANDA_TANGAN: 'Tanda Tangan',
  FOTO: 'Foto',
  QR_STAMP: 'QR Scan',
  FILE: 'File',
  LOGBOOK: 'Logbook',
  ATTENDANCE: 'Absensi',
};

export function DimensionDetailList({ items, dimensiLabel }: DimensionDetailListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
        Tidak ada item untuk dimensi ini.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        {dimensiLabel}
      </h3>
      {items.map((item) => {
        const status = item.entryStatus ?? null;
        const canSubmit = !status || status === 'CANCELLED' || status === 'REJECTED';

        return (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900 p-4 flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">
                {item.namaItem}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {EVIDENCE_TYPE_LABELS[item.evidenceType] ?? item.evidenceType}
                {item.keterangan && (
                  <span className="ml-2 text-gray-400 dark:text-gray-500">· {item.keterangan}</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {status && (
                <StatusBadge
                  status={status as 'VERIFIED' | 'PENDING' | 'REJECTED' | 'CANCELLED'}
                />
              )}
              {canSubmit ? (
                <Link
                  href={`/dashboard/passport/${item.id}/submit`}
                  className="text-xs px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors font-medium"
                >
                  {status === 'REJECTED' || status === 'CANCELLED' ? 'Kirim Ulang' : 'Ajukan'}
                </Link>
              ) : item.entryId ? (
                <Link
                  href={`/dashboard/passport/${item.id}`}
                  className="text-xs px-3 py-1.5 bg-white dark:bg-slate-700 border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors font-medium"
                >
                  Lihat
                </Link>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
