/**
 * src/components/event/NPSHistogram.tsx
 * Bar chart histogram showing distribution of NPS scores 0-10.
 */

import React from 'react';

interface NPSHistogramProps {
  histogram: Record<string, number>;
  total: number;
}

export function NPSHistogram({ histogram, total }: NPSHistogramProps) {
  const scores = Array.from({ length: 11 }, (_, i) => i); // 0..10
  const maxCount = Math.max(...scores.map((s) => histogram[String(s)] ?? 0), 1);

  const getBarColor = (score: number) => {
    if (score <= 6) return 'bg-red-400 dark:bg-red-500';
    if (score <= 8) return 'bg-amber-400 dark:bg-amber-500';
    return 'bg-emerald-500 dark:bg-emerald-400';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Distribusi Skor Kepuasan
      </h3>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-400" />
          Detractor (0–6)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-400" />
          Passive (7–8)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          Promoter (9–10)
        </span>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-1.5 h-32">
        {scores.map((score) => {
          const count = histogram[String(score)] ?? 0;
          const heightPct = total > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={score} className="flex-1 flex flex-col items-center gap-1">
              {count > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{count}</span>
              )}
              <div className="w-full flex items-end" style={{ height: '80px' }}>
                <div
                  className={`w-full rounded-t-sm transition-all ${getBarColor(score)}`}
                  style={{ height: `${heightPct}%` }}
                  title={`Skor ${score}: ${count} responden`}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
