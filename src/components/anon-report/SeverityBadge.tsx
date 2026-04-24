/**
 * src/components/anon-report/SeverityBadge.tsx
 * NAWASENA M12 — Severity badge for BLM/Satgas dashboard.
 *
 * Only shown in dashboard (not public form/tracker).
 */

import { AnonSeverity } from '@prisma/client';

interface SeverityBadgeProps {
  severity: AnonSeverity;
  size?: 'sm' | 'md';
}

const SEVERITY_CONFIG = {
  [AnonSeverity.GREEN]: {
    label: 'Rendah',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    dot: 'bg-green-500',
  },
  [AnonSeverity.YELLOW]: {
    label: 'Sedang',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  [AnonSeverity.RED]: {
    label: 'Tinggi',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    dot: 'bg-red-500',
  },
};

export function SeverityBadge({ severity, size = 'sm' }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.className} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
