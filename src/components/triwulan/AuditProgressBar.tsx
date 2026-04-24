'use client';

/**
 * src/components/triwulan/AuditProgressBar.tsx
 * NAWASENA M14 — Shows BLM audit substansi progress (x/10 items assessed).
 */

import { CheckCircle2 } from 'lucide-react';

interface AuditProgressBarProps {
  assessed: number;
  total: number;
  className?: string;
}

export function AuditProgressBar({ assessed, total, className = '' }: AuditProgressBarProps) {
  const pct = total > 0 ? Math.min(100, (assessed / total) * 100) : 0;
  const isComplete = assessed >= total;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400 font-medium">
          Progress Audit Substansi
        </span>
        <span
          className={`flex items-center gap-1 font-semibold ${
            isComplete
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-sky-600 dark:text-sky-400'
          }`}
        >
          {isComplete && <CheckCircle2 className="h-3.5 w-3.5" />}
          {assessed}/{total}
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            isComplete ? 'bg-emerald-500' : 'bg-sky-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isComplete && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Semua muatan wajib telah dinilai.
        </p>
      )}
    </div>
  );
}
