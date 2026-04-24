/**
 * src/components/reference/ForbiddenActCard.tsx
 * Card displaying a single forbidden act.
 */

import React from 'react';

interface ForbiddenActCardProps {
  act: {
    id: string;
    category: string;
    description: string;
    regulationSource: string;
    severity: string;
    consequence: string;
    detectionSignal: string;
    ordinal: number;
  };
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  LOW: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
};

export function ForbiddenActCard({ act }: ForbiddenActCardProps) {
  const severityStyle = SEVERITY_STYLES[act.severity] ?? SEVERITY_STYLES.LOW;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-900/50 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-lg">
            {act.id}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severityStyle}`}>
            {act.severity}
          </span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{act.category}</span>
      </div>

      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">{act.description}</p>

      <div className="space-y-2 text-xs">
        <div>
          <span className="font-semibold text-gray-600 dark:text-gray-400">Konsekuensi: </span>
          <span className="text-gray-700 dark:text-gray-300">{act.consequence}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-600 dark:text-gray-400">Sinyal Deteksi: </span>
          <span className="text-gray-700 dark:text-gray-300">{act.detectionSignal}</span>
        </div>
        <div className="text-gray-400 dark:text-gray-500 italic">Dasar: {act.regulationSource}</div>
      </div>
    </div>
  );
}
