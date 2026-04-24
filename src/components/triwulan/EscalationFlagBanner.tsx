'use client';

/**
 * src/components/triwulan/EscalationFlagBanner.tsx
 * NAWASENA M14 — Shows URGENT / WARNING escalation banner if applicable.
 */

import { AlertTriangle, AlertCircle } from 'lucide-react';
import { TriwulanEscalationLevel, EscalationRuleKey } from '@prisma/client';

interface EscalationFlagBannerProps {
  level: TriwulanEscalationLevel;
  flags: EscalationRuleKey[];
  className?: string;
}

const FLAG_LABELS: Record<EscalationRuleKey, string> = {
  [EscalationRuleKey.RETENTION_LOW]: 'Retensi peserta rendah',
  [EscalationRuleKey.FORBIDDEN_ACTS_VIOLATION]: 'Tindakan terlarang terdeteksi',
  [EscalationRuleKey.INCIDENTS_RED_UNRESOLVED]: 'Insiden merah belum terselesaikan',
  [EscalationRuleKey.ANON_HARASSMENT_PRESENT]: 'Laporan pelecehan anonim aktif',
  [EscalationRuleKey.PAKTA_SIGNING_LOW]: 'Penandatanganan pakta rendah',
  [EscalationRuleKey.NPS_NEGATIVE]: 'NPS negatif',
  [EscalationRuleKey.CUSTOM]: 'Eskalasi kustom',
};

export function EscalationFlagBanner({ level, flags, className = '' }: EscalationFlagBannerProps) {
  if (level === TriwulanEscalationLevel.NONE || flags.length === 0) {
    return null;
  }

  const isUrgent = level === TriwulanEscalationLevel.URGENT;

  return (
    <div
      className={`rounded-xl border p-4 ${
        isUrgent
          ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
          : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {isUrgent ? (
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        )}
        <div>
          <p
            className={`text-sm font-semibold ${
              isUrgent
                ? 'text-red-800 dark:text-red-300'
                : 'text-amber-800 dark:text-amber-300'
            }`}
          >
            {isUrgent ? 'Eskalasi URGEN' : 'Peringatan Eskalasi'}
          </p>
          <ul className="mt-1 space-y-0.5">
            {flags.map((flag) => (
              <li
                key={flag}
                className={`text-xs ${
                  isUrgent
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                • {FLAG_LABELS[flag] ?? flag}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
