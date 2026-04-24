'use client';

/**
 * src/components/mental-health/TransitionChart.tsx
 * NAWASENA M11 — F1→F4 transition matrix table (admin-only).
 *
 * Shows a grid: F1 severity (rows) × F4 severity (cols).
 * Masked cells shown as "< 5".
 * Color intensity indicates relative count.
 */

import React from 'react';

export interface TransitionRow {
  f1Severity: string;
  f4Severity: string;
  count: number | null;
  masked: boolean;
}

interface TransitionChartProps {
  rows: TransitionRow[];
}

const SEVERITIES = ['GREEN', 'YELLOW', 'RED'];

const SEVERITY_LABELS: Record<string, string> = {
  GREEN: 'Hijau',
  YELLOW: 'Kuning',
  RED: 'Merah',
};

const CELL_COLORS: Record<string, Record<string, string>> = {
  GREEN: {
    GREEN: 'bg-teal-100 dark:bg-teal-900/40',
    YELLOW: 'bg-amber-50 dark:bg-amber-950/20',
    RED: 'bg-rose-50 dark:bg-rose-950/20',
  },
  YELLOW: {
    GREEN: 'bg-teal-50 dark:bg-teal-950/20',
    YELLOW: 'bg-amber-100 dark:bg-amber-900/40',
    RED: 'bg-rose-100 dark:bg-rose-900/40',
  },
  RED: {
    GREEN: 'bg-teal-100 dark:bg-teal-900/40',
    YELLOW: 'bg-amber-100 dark:bg-amber-900/40',
    RED: 'bg-rose-200 dark:bg-rose-900/60',
  },
};

export function TransitionChart({ rows }: TransitionChartProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
        Tidak ada data transisi untuk ditampilkan. Pastikan ada peserta yang menyelesaikan F1 dan F4.
      </div>
    );
  }

  // Build lookup map: f1Severity:f4Severity → row
  const lookup = new Map<string, TransitionRow>();
  for (const row of rows) {
    lookup.set(`${row.f1Severity}:${row.f4Severity}`, row);
  }

  return (
    <div className="flex flex-col gap-4 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-32">
              F1 &rarr; F4
            </th>
            {SEVERITIES.map((col) => (
              <th key={col} className="p-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 w-28">
                {SEVERITY_LABELS[col]}
                <div className="text-xs font-normal text-gray-400">(F4)</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SEVERITIES.map((f1Sev) => (
            <tr key={f1Sev} className="border-t border-gray-100 dark:border-gray-800">
              <td className="p-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                {SEVERITY_LABELS[f1Sev]}
                <div className="text-xs font-normal text-gray-400">(F1)</div>
              </td>
              {SEVERITIES.map((f4Sev) => {
                const cell = lookup.get(`${f1Sev}:${f4Sev}`);
                const colorClass = CELL_COLORS[f1Sev]?.[f4Sev] ?? 'bg-gray-50 dark:bg-gray-800/40';

                return (
                  <td key={f4Sev} className={`p-3 text-center rounded-lg ${colorClass}`}>
                    {cell ? (
                      cell.masked ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">&lt;5</span>
                      ) : (
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                          {cell.count}
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
        <p>Baris = severity saat F1. Kolom = severity saat F4.</p>
        <p>Sel diagonal (hijau ke hijau, dll.) = tidak ada perubahan severity.</p>
        <p>Sel &lt;5 disamarkan sesuai kebijakan privasi UU PDP.</p>
      </div>
    </div>
  );
}
