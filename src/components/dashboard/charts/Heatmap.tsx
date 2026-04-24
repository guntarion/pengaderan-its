/**
 * src/components/dashboard/charts/Heatmap.tsx
 * Mood heatmap for KP-Group — shows each member's mood scores per day.
 */

'use client';

import React from 'react';

interface HeatmapCell {
  value: number | null; // 1-5 mood score or null
  label?: string;
}

interface HeatmapRow {
  name: string;
  cells: HeatmapCell[];
}

interface HeatmapProps {
  rows: HeatmapRow[];
  columnLabels?: string[];
  title?: string;
  className?: string;
}

function getMoodColor(value: number | null): string {
  if (value === null) return 'bg-gray-100 dark:bg-gray-700';
  if (value >= 4) return 'bg-emerald-400 dark:bg-emerald-500';
  if (value >= 3) return 'bg-sky-300 dark:bg-sky-500';
  if (value >= 2) return 'bg-amber-300 dark:bg-amber-500';
  return 'bg-red-400 dark:bg-red-500';
}

export function Heatmap({ rows, columnLabels, title, className = '' }: HeatmapProps) {
  if (!rows || rows.length === 0) {
    return (
      <div className={`text-xs text-gray-400 py-4 text-center ${className}`}>
        Belum ada data mood
      </div>
    );
  }

  const colCount = rows[0].cells.length;

  return (
    <div className={className}>
      {title && (
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-gray-400 dark:text-gray-500 pr-2 py-1 font-normal min-w-16">
                Nama
              </th>
              {columnLabels
                ? columnLabels.map((label, i) => (
                    <th
                      key={i}
                      className="text-center text-gray-400 dark:text-gray-500 px-0.5 py-1 font-normal"
                    >
                      {label}
                    </th>
                  ))
                : Array.from({ length: colCount }, (_, i) => (
                    <th
                      key={i}
                      className="text-center text-gray-400 dark:text-gray-500 px-0.5 py-1 font-normal"
                    >
                      D{i + 1}
                    </th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td className="text-gray-700 dark:text-gray-300 pr-2 py-0.5 truncate max-w-20">
                  {row.name}
                </td>
                {row.cells.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-0.5 py-0.5">
                    <div
                      className={`w-5 h-5 rounded ${getMoodColor(cell.value)} mx-auto`}
                      title={cell.value !== null ? `Mood: ${cell.value}` : 'Tidak ada data'}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Baik (4-5)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-sky-300 inline-block" /> Cukup (3)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-300 inline-block" /> Perlu perhatian (2)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-400 inline-block" /> Rendah (1)
          </span>
        </div>
      </div>
    </div>
  );
}
