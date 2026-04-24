'use client';

/**
 * src/components/safeguard/IncidentStatusBadge.tsx
 * NAWASENA M10 — Badge component for incident status and severity.
 */

import { Badge } from '@/components/ui/badge';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

// ---- Severity badge ----

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  RED: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  YELLOW: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  GREEN: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
};

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  RED: 'KRITIS',
  YELLOW: 'SEDANG',
  GREEN: 'RINGAN',
};

interface SeverityBadgeProps {
  severity: IncidentSeverity | string;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const key = severity as IncidentSeverity;
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-semibold border',
        SEVERITY_STYLES[key] ?? 'bg-gray-100 text-gray-700',
        className,
      )}
    >
      {SEVERITY_LABELS[key] ?? severity}
    </Badge>
  );
}

// ---- Status badge ----

const STATUS_STYLES: Record<string, string> = {
  PENDING_REVIEW: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300',
  OPEN: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',
  IN_REVIEW: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',
  RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300',
  ESCALATED_TO_SATGAS: 'bg-red-100 text-red-900 border-red-400 dark:bg-red-900/40 dark:text-red-300 font-bold',
  RETRACTED_BY_REPORTER: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/30 dark:text-gray-400',
  RETRACTED_BY_SC: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/30 dark:text-gray-400',
  SUPERSEDED: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/30 dark:text-slate-400',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: 'Perlu Review',
  OPEN: 'Terbuka',
  IN_REVIEW: 'Ditangani',
  RESOLVED: 'Selesai',
  ESCALATED_TO_SATGAS: 'Eskalasi Satgas',
  RETRACTED_BY_REPORTER: 'Ditarik Reporter',
  RETRACTED_BY_SC: 'Ditarik SC',
  SUPERSEDED: 'Digantikan',
};

interface StatusBadgeProps {
  status: IncidentStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs border',
        STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700',
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ---- Combined IncidentStatusBadge ----

interface IncidentStatusBadgeProps {
  severity: IncidentSeverity | string;
  status: IncidentStatus | string;
  className?: string;
}

export function IncidentStatusBadge({ severity, status, className }: IncidentStatusBadgeProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <SeverityBadge severity={severity} />
      <StatusBadge status={status} />
    </div>
  );
}
