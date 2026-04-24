/**
 * src/components/rubric/RubricScoreBadge.tsx
 * NAWASENA M04 — Compact badge showing rubric score level.
 *
 * Level 1=gray (Benchmark), 2=blue (Milestone 2), 3=green (Milestone 3), 4=gold (Capstone).
 */

'use client';

import React from 'react';

interface RubricScoreBadgeProps {
  level: number;
  showLabel?: boolean;
}

const LEVEL_CONFIG: Record<number, { label: string; className: string }> = {
  1: {
    label: 'Benchmark',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  },
  2: {
    label: 'Milestone 2',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  },
  3: {
    label: 'Milestone 3',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
  },
  4: {
    label: 'Capstone',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 dark:border-amber-700',
  },
};

export function RubricScoreBadge({ level, showLabel = false }: RubricScoreBadgeProps) {
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG[1];

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${config.className}`}
      title={config.label}
    >
      <span className="font-bold">L{level}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
