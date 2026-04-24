/**
 * src/components/reference/RubrikLevelTable.tsx
 * 4-level AAC&U rubric table for a single rubrik key.
 */

import React from 'react';

interface RubrikLevel {
  id: string;
  level: number;
  levelLabel: string;
  levelDescriptor: string;
}

interface RubrikLevelTableProps {
  rubrikKey: string;
  rubrikLabel: string;
  levels: RubrikLevel[];
}

const LEVEL_COLORS = [
  'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800',
  'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800',
  'bg-sky-50 dark:bg-sky-900/20 border-sky-100 dark:border-sky-800',
  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800',
];

export function RubrikLevelTable({ rubrikKey, rubrikLabel, levels }: RubrikLevelTableProps) {
  const sortedLevels = [...levels].sort((a, b) => a.level - b.level);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
      <div className="mb-4">
        <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded-lg">
          {rubrikKey}
        </span>
        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mt-2">{rubrikLabel}</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sortedLevels.map((level, idx) => (
          <div
            key={level.id}
            className={`rounded-xl border p-3 ${LEVEL_COLORS[idx] ?? LEVEL_COLORS[0]}`}
          >
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Level {level.level}: {level.levelLabel}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{level.levelDescriptor}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
