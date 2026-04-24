'use client';

/**
 * src/components/mental-health/AggregateChart.tsx
 * NAWASENA M11 — Aggregate severity bar chart (admin-only).
 *
 * Groups rows by kpGroupId. Per group: shows GREEN/YELLOW/RED bars.
 * Masked cells shown as "< 5" (no exact number).
 *
 * PRIVACY: Admin-side only. Uses severity colors (not maba-facing).
 * Masked cells render with dashed border pattern — clearly marked.
 */

import React from 'react';

export interface AggregateRow {
  kpGroupId: string | null;
  severity: string;
  phase: string;
  count: number | null;
  masked: boolean;
}

interface AggregateChartProps {
  rows: AggregateRow[];
}

const SEVERITY_COLORS: Record<string, { bar: string; label: string; text: string }> = {
  GREEN: {
    bar: 'bg-teal-500',
    label: 'Hijau',
    text: 'text-teal-700 dark:text-teal-300',
  },
  YELLOW: {
    bar: 'bg-amber-400',
    label: 'Kuning',
    text: 'text-amber-700 dark:text-amber-300',
  },
  RED: {
    bar: 'bg-rose-500',
    label: 'Merah',
    text: 'text-rose-700 dark:text-rose-300',
  },
};

export function AggregateChart({ rows }: AggregateChartProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
        Tidak ada data agregat untuk ditampilkan.
      </div>
    );
  }

  // Group by kpGroupId
  const groups = new Map<string, AggregateRow[]>();
  for (const row of rows) {
    const key = row.kpGroupId ?? '(tidak terdaftar)';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  // Max count (for bar width scaling) — only non-masked rows
  const maxCount = Math.max(
    ...rows.filter((r) => !r.masked && r.count !== null).map((r) => r.count!),
    5, // minimum scale
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(SEVERITY_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${val.bar}`} />
            <span className="text-gray-600 dark:text-gray-400">{val.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-2 border-dashed border-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">Data disamarkan (&lt; 5)</span>
        </div>
      </div>

      {/* Group bars */}
      <div className="flex flex-col gap-5">
        {Array.from(groups.entries()).map(([groupId, groupRows]) => (
          <div key={groupId} className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Kelompok: <span className="text-gray-700 dark:text-gray-300 normal-case">{groupId}</span>
            </p>
            {(['GREEN', 'YELLOW', 'RED'] as const).map((sev) => {
              const row = groupRows.find((r) => r.severity === sev);
              const colors = SEVERITY_COLORS[sev];

              if (!row) return null;

              const barWidth = row.masked
                ? '20px'
                : `${Math.max(((row.count ?? 0) / maxCount) * 100, 2)}%`;

              return (
                <div key={sev} className="flex items-center gap-3">
                  <span className={`text-xs w-12 shrink-0 ${colors.text}`}>
                    {colors.label}
                  </span>
                  <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
                    <div
                      className={`h-full rounded-lg transition-all duration-300 ${
                        row.masked
                          ? 'border-2 border-dashed border-gray-400 bg-gray-100 dark:bg-gray-700'
                          : colors.bar
                      }`}
                      style={{ width: barWidth }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-xs font-medium text-white drop-shadow-sm">
                      {row.masked ? '<5' : row.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Data dengan sel &lt; 5 orang disamarkan sesuai kebijakan privasi UU PDP.
        Ini adalah data agregat — tidak ada data individual yang dapat diidentifikasi.
      </p>
    </div>
  );
}
