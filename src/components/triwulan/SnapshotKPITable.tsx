'use client';

/**
 * src/components/triwulan/SnapshotKPITable.tsx
 * NAWASENA M14 — Displays KPI snapshot section from dataSnapshotJsonb.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiRow {
  label: string;
  value: number | null;
  threshold?: number | null;
  unit?: string;
  trend?: number[];
}

interface SnapshotKPITableProps {
  kpiData: Record<string, unknown> | null;
  className?: string;
}

function formatValue(value: number | null, unit = '%'): string {
  if (value === null) return '—';
  return `${value.toFixed(1)}${unit}`;
}

function TrendIndicator({ trend }: { trend?: number[] }) {
  if (!trend || trend.length < 2) return <Minus className="h-3.5 w-3.5 text-gray-400" />;
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  if (last > prev) return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (last < prev) return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-gray-400" />;
}

function extractKpiRows(kpi: Record<string, unknown>): KpiRow[] {
  const rows: KpiRow[] = [];

  const retention = kpi.retention as { value: number; threshold: number } | null;
  rows.push({
    label: 'Retensi Peserta',
    value: retention?.value ?? null,
    threshold: retention?.threshold ?? 85,
    unit: '%',
  });

  const nps = kpi.npsAvg as { value: number; trend: number[] } | null;
  rows.push({
    label: 'NPS Rata-Rata',
    value: nps?.value ?? null,
    unit: '',
    trend: nps?.trend,
  });

  const pulse = kpi.pulseAvg as { value: number; trend: number[] } | null;
  rows.push({
    label: 'Pulse Score',
    value: pulse?.value ?? null,
    unit: '/5',
    trend: pulse?.trend,
  });

  const journal = kpi.journalRate as { value: number } | null;
  rows.push({ label: 'Tingkat Pengisian Jurnal', value: journal?.value ?? null, unit: '%' });

  const attendance = kpi.attendanceRate as { value: number } | null;
  rows.push({ label: 'Kehadiran', value: attendance?.value ?? null, unit: '%' });

  const passport = kpi.passportCompletionRate as { value: number } | null;
  rows.push({ label: 'Penyelesaian Passport', value: passport?.value ?? null, unit: '%' });

  return rows;
}

export function SnapshotKPITable({ kpiData, className = '' }: SnapshotKPITableProps) {
  if (!kpiData) {
    return (
      <div className={`text-sm text-gray-400 italic ${className}`}>
        Data KPI tidak tersedia untuk periode ini.
      </div>
    );
  }

  const rows = extractKpiRows(kpiData);

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-sky-100 dark:border-sky-900">
            <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 w-2/3">
              Indikator
            </th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 w-24">
              Nilai
            </th>
            <th className="text-center py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 w-10">
              Tren
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isBelowThreshold =
              row.threshold !== undefined &&
              row.threshold !== null &&
              row.value !== null &&
              row.value < row.threshold;

            return (
              <tr
                key={row.label}
                className="border-b border-gray-50 dark:border-slate-700/50 last:border-0"
              >
                <td className="py-2.5 text-gray-700 dark:text-gray-300">{row.label}</td>
                <td
                  className={`py-2.5 text-right font-medium tabular-nums ${
                    isBelowThreshold
                      ? 'text-red-600 dark:text-red-400'
                      : row.value !== null
                      ? 'text-gray-800 dark:text-gray-100'
                      : 'text-gray-400'
                  }`}
                >
                  {formatValue(row.value, row.unit)}
                </td>
                <td className="py-2.5 flex justify-center">
                  <TrendIndicator trend={row.trend} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
