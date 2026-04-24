'use client';

/**
 * src/components/anon-report/AnonReportSummaryCard.tsx
 * NAWASENA M12 — Aggregate summary card with bar chart and masked cells.
 *
 * Shows:
 *   - Bar chart: count per category
 *   - Stacked bar: severity breakdown per category
 *   - Summary totals: submitted, escalated, resolved
 *   - Masked cells shown as "< 3"
 *
 * Uses recharts (already installed).
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { AnonCategory, AnonSeverity } from '@prisma/client';

export interface AggregateRow {
  category: string;
  severity: string;
  status: string;
  count: number | null;
  masked: boolean;
}

export interface AggregateTotals {
  submitted: number;
  escalated: number;
  resolved: number;
}

interface AnonReportSummaryCardProps {
  aggregate: AggregateRow[];
  totals: AggregateTotals;
  isLoading?: boolean;
}

const CATEGORY_LABELS: Record<AnonCategory, string> = {
  BULLYING: 'Perundungan',
  HARASSMENT: 'Pelecehan',
  UNFAIR: 'Ketidakadilan',
  SUGGESTION: 'Saran',
  OTHER: 'Lainnya',
};

const SEVERITY_COLORS: Record<AnonSeverity, string> = {
  GREEN: '#22c55e',
  YELLOW: '#f59e0b',
  RED: '#ef4444',
};

const SEVERITY_LABELS: Record<AnonSeverity, string> = {
  GREEN: 'Rendah',
  YELLOW: 'Sedang',
  RED: 'Tinggi',
};

// Build per-category count data for simple bar chart
function buildCategoryData(aggregate: AggregateRow[]) {
  const byCategory: Record<string, number> = {};

  for (const row of aggregate) {
    if (!byCategory[row.category]) byCategory[row.category] = 0;
    if (row.count !== null) {
      byCategory[row.category] += row.count;
    }
  }

  return Object.entries(byCategory).map(([category, count]) => ({
    name: CATEGORY_LABELS[category as AnonCategory] ?? category,
    count,
    masked: aggregate.some((r) => r.category === category && r.masked),
  }));
}

// Build per-category stacked by severity data
function buildStackedData(aggregate: AggregateRow[]) {
  const categories = [...new Set(aggregate.map((r) => r.category))];

  return categories.map((cat) => {
    const entry: Record<string, string | number> = {
      name: CATEGORY_LABELS[cat as AnonCategory] ?? cat,
    };

    for (const sev of Object.values(AnonSeverity)) {
      const row = aggregate.find((r) => r.category === cat && r.severity === sev);
      entry[sev] = row ? (row.count ?? 0) : 0;
    }

    return entry;
  });
}

export function AnonReportSummaryCard({
  aggregate,
  totals,
  isLoading,
}: AnonReportSummaryCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-sky-100 bg-white p-5 dark:border-sky-900 dark:bg-gray-900">
        <div className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (aggregate.length === 0) {
    return (
      <div className="rounded-2xl border border-sky-100 bg-white p-5 dark:border-sky-900 dark:bg-gray-900">
        <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada data laporan.</p>
      </div>
    );
  }

  const categoryData = buildCategoryData(aggregate);
  const stackedData = buildStackedData(aggregate);
  const hasMaskedCells = aggregate.some((r) => r.masked);

  return (
    <div className="rounded-2xl border border-sky-100 bg-white dark:border-sky-900 dark:bg-gray-900">
      {/* Totals */}
      <div className="grid grid-cols-3 divide-x divide-sky-100 border-b border-sky-100 dark:divide-sky-900 dark:border-sky-900">
        {[
          { label: 'Total Laporan', value: totals.submitted },
          { label: 'Diteruskan Satgas', value: totals.escalated },
          { label: 'Selesai', value: totals.resolved },
        ].map((stat) => (
          <div key={stat.label} className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="p-5 space-y-6">
        {/* Bar chart: count per category */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Laporan per Kategori
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e0f2fe',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                formatter={(value) => [value as number, 'Laporan']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {categoryData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.masked ? '#e5e7eb' : '#0ea5e9'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stacked bar: severity breakdown per category */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Breakdown Tingkat per Kategori
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stackedData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e0f2fe',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                formatter={(value) => SEVERITY_LABELS[value as AnonSeverity] ?? value}
              />
              {Object.values(AnonSeverity).map((sev) => (
                <Bar
                  key={sev}
                  dataKey={sev}
                  stackId="a"
                  fill={SEVERITY_COLORS[sev]}
                  radius={sev === 'RED' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Masked cells notice */}
        {hasMaskedCells && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            * Beberapa sel disembunyikan karena jumlah &lt; 3 (cell floor untuk privasi).
          </p>
        )}
      </div>
    </div>
  );
}
