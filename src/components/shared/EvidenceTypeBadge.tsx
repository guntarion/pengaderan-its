'use client';

/**
 * src/components/shared/EvidenceTypeBadge.tsx
 * NAWASENA M05 — Display evidence type as a styled badge.
 */

interface EvidenceTypeBadgeProps {
  type: string;
}

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  TANDA_TANGAN: {
    label: 'Tanda Tangan',
    className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800',
  },
  FOTO: {
    label: 'Foto',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  },
  QR_STAMP: {
    label: 'QR Scan',
    className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800',
  },
  FILE: {
    label: 'File',
    className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  },
  LOGBOOK: {
    label: 'Logbook',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
  },
  ATTENDANCE: {
    label: 'Absensi',
    className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
  },
};

export function EvidenceTypeBadge({ type }: EvidenceTypeBadgeProps) {
  const config = TYPE_CONFIG[type] ?? {
    label: type,
    className:
      'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
