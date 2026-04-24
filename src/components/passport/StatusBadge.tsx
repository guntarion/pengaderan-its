'use client';

/**
 * src/components/passport/StatusBadge.tsx
 * NAWASENA M05 — Color-coded badge for PassportEntryStatus.
 */

interface StatusBadgeProps {
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CANCELLED' | 'NOT_STARTED';
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<StatusBadgeProps['status'], string> = {
  VERIFIED:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  PENDING:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  REJECTED:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  CANCELLED:
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  NOT_STARTED:
    'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
};

const STATUS_LABELS: Record<StatusBadgeProps['status'], string> = {
  VERIFIED: 'Terverifikasi',
  PENDING: 'Menunggu',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
  NOT_STARTED: 'Belum Dimulai',
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClass} ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
