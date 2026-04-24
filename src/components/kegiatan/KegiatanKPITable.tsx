/**
 * src/components/kegiatan/KegiatanKPITable.tsx
 * Table of KPI definitions for a kegiatan.
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';

interface KPIDef {
  id: string;
  text: string;
  type: string;
  unit: string | null;
  targetNumeric: number | null;
  isLeading: boolean;
  measureMethod: string | null;
}

interface KegiatanKPITableProps {
  kpiDefs: KPIDef[];
}

const KPI_TYPE_LABEL: Record<string, string> = {
  HIGHER_BETTER: 'Lebih Tinggi = Lebih Baik',
  LOWER_BETTER: 'Lebih Rendah = Lebih Baik',
  ZERO_ONE: 'Ya / Tidak',
  RANGE: 'Rentang',
};

export function KegiatanKPITable({ kpiDefs }: KegiatanKPITableProps) {
  if (kpiDefs.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
      <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-emerald-500" />
        Indikator KPI ({kpiDefs.length})
      </h2>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-4">
                Indikator
              </th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-4">
                Tipe
              </th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-4">
                Satuan
              </th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-4">
                Target
              </th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Leading
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
            {kpiDefs.map((kpi) => (
              <tr key={kpi.id} className="hover:bg-sky-50 dark:hover:bg-sky-900/10 transition-colors">
                <td className="py-2.5 pr-4 font-medium text-gray-800 dark:text-gray-200">
                  {kpi.text}
                </td>
                <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">
                  {KPI_TYPE_LABEL[kpi.type] ?? kpi.type}
                </td>
                <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">{kpi.unit ?? '—'}</td>
                <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">
                  {kpi.targetNumeric !== null ? kpi.targetNumeric : '—'}
                </td>
                <td className="py-2.5 text-gray-600 dark:text-gray-400">
                  {kpi.isLeading ? 'Ya' : 'Tidak'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
