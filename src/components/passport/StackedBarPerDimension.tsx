'use client';

/**
 * src/components/passport/StackedBarPerDimension.tsx
 * NAWASENA M05 — Recharts stacked bar for passport progress per dimension.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ProgressSummary } from '@/lib/passport/progress.service';

interface StackedBarProps {
  progress: ProgressSummary;
  height?: number;
}

const DIMENSION_LABELS: Record<string, string> = {
  D1_ORANG: 'D1 Orang',
  D2_FASILITAS: 'D2 Fasilitas',
  D3_BIDANG_PEMBELAJARAN: 'D3 Bidang',
  D4_KARIR: 'D4 Karir',
  D5_KEMAHASISWAAN: 'D5 Kemhs.',
  D6_AKADEMIK: 'D6 Akademik',
  D7_KEKOMPAKAN: 'D7 Kompak',
  D8_LOYALITAS: 'D8 Loyalitas',
  D9_MENTAL_POSITIF: 'D9 Mental',
  D10_KEPEDULIAN_SOSIAL: 'D10 Sosial',
  D11_KEINSINYURAN: 'D11 Insinyur',
};

export function StackedBarPerDimension({ progress, height = 280 }: StackedBarProps) {
  const data = Object.entries(progress.byDimension).map(([key, dp]) => ({
    name: DIMENSION_LABELS[key] ?? key,
    Terverifikasi: dp.verified,
    Menunggu: dp.pending,
    Ditolak: dp.rejected,
    'Belum Mulai': dp.notStarted,
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900 p-5">
      <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Progress per Dimensi
      </h2>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            className="text-gray-500 dark:text-gray-400"
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-background, white)',
              border: '1px solid #e0f2fe',
              borderRadius: '12px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="Terverifikasi" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Menunggu" stackId="a" fill="#f59e0b" />
          <Bar dataKey="Ditolak" stackId="a" fill="#ef4444" />
          <Bar dataKey="Belum Mulai" stackId="a" fill="#e0f2fe" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
