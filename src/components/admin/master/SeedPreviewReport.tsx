/**
 * src/components/admin/master/SeedPreviewReport.tsx
 * Displays the diff report from seed preview.
 */

'use client';

import React from 'react';

interface DiffResult {
  added: number;
  updated: number;
  unchanged: number;
  orphaned: number;
}

interface SeedReport {
  [entity: string]: DiffResult;
}

interface SeedPreviewReportProps {
  report: SeedReport | null;
  raw: string | null;
  error?: string | null;
}

export function SeedPreviewReport({ report, raw, error }: SeedPreviewReportProps) {
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">Error</p>
        <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto">{error}</pre>
      </div>
    );
  }

  if (!report && raw) {
    return (
      <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 overflow-auto max-h-64">
        {raw}
      </pre>
    );
  }

  if (!report) return null;

  const entities = Object.entries(report);
  const totalAdded = entities.reduce((sum, [, v]) => sum + v.added, 0);
  const totalUpdated = entities.reduce((sum, [, v]) => sum + v.updated, 0);
  const hasChanges = totalAdded > 0 || totalUpdated > 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className={`p-4 rounded-xl border ${hasChanges ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}>
        <p className={`text-sm font-semibold mb-1 ${hasChanges ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
          {hasChanges ? `${totalAdded} baris baru, ${totalUpdated} baris diperbarui` : 'Tidak ada perubahan — data sudah up-to-date'}
        </p>
      </div>

      {/* Entity table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-4">Entity</th>
              <th className="text-right py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 pr-4">Baru</th>
              <th className="text-right py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 pr-4">Diperbarui</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-4">Sama</th>
              <th className="text-right py-2 text-xs font-semibold text-red-500 dark:text-red-400">Orphan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
            {entities.map(([entity, diff]) => (
              <tr key={entity}>
                <td className="py-2 pr-4 font-mono text-xs text-gray-700 dark:text-gray-300">{entity}</td>
                <td className="py-2 pr-4 text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400">{diff.added}</td>
                <td className="py-2 pr-4 text-right text-xs font-semibold text-amber-600 dark:text-amber-400">{diff.updated}</td>
                <td className="py-2 pr-4 text-right text-xs text-gray-500 dark:text-gray-400">{diff.unchanged}</td>
                <td className="py-2 text-right text-xs text-red-500 dark:text-red-400">{diff.orphaned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
