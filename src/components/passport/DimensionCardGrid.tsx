'use client';

/**
 * src/components/passport/DimensionCardGrid.tsx
 * NAWASENA M05 — 11 dimension cards with progress + click to detail.
 */

import Link from 'next/link';
import type { ProgressSummary } from '@/lib/passport/progress.service';

interface DimensionCardGridProps {
  progress: ProgressSummary;
}

const DIMENSION_META: Record<string, { label: string; shortLabel: string; icon: string }> = {
  D1_ORANG: { label: 'Dimensi Orang', shortLabel: 'Orang', icon: '👥' },
  D2_FASILITAS: { label: 'Dimensi Fasilitas', shortLabel: 'Fasilitas', icon: '🏛️' },
  D3_BIDANG_PEMBELAJARAN: { label: 'Bidang Pembelajaran', shortLabel: 'Bidang', icon: '📚' },
  D4_KARIR: { label: 'Dimensi Karir', shortLabel: 'Karir', icon: '💼' },
  D5_KEMAHASISWAAN: { label: 'Kemahasiswaan', shortLabel: 'Kemhs.', icon: '🎓' },
  D6_AKADEMIK: { label: 'Dimensi Akademik', shortLabel: 'Akademik', icon: '📊' },
  D7_KEKOMPAKAN: { label: 'Kekompakan', shortLabel: 'Kompak', icon: '🤝' },
  D8_LOYALITAS: { label: 'Loyalitas', shortLabel: 'Loyalitas', icon: '⭐' },
  D9_MENTAL_POSITIF: { label: 'Mental Positif', shortLabel: 'Mental', icon: '💪' },
  D10_KEPEDULIAN_SOSIAL: { label: 'Kepedulian Sosial', shortLabel: 'Sosial', icon: '❤️' },
  D11_KEINSINYURAN: { label: 'Keinsinyuran', shortLabel: 'Insinyur', icon: '⚙️' },
};

export function DimensionCardGrid({ progress }: DimensionCardGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Object.entries(progress.byDimension).map(([dimensiKey, dp]) => {
        const meta = DIMENSION_META[dimensiKey] ?? {
          label: dimensiKey,
          shortLabel: dimensiKey,
          icon: '📋',
        };
        const percentage =
          dp.total > 0 ? Math.round((dp.verified / dp.total) * 100) : 0;

        const borderColor =
          percentage === 100
            ? 'border-emerald-200 dark:border-emerald-800'
            : dp.pending > 0
            ? 'border-amber-200 dark:border-amber-800'
            : 'border-sky-100 dark:border-sky-900';

        return (
          <Link
            key={dimensiKey}
            href={`/dashboard/passport?dimensi=${dimensiKey}`}
            className={`bg-white dark:bg-slate-800 rounded-2xl border ${borderColor} p-4 hover:shadow-md transition-shadow cursor-pointer block`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-xl">{meta.icon}</span>
              <span
                className={`text-xs font-bold ${
                  percentage === 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-sky-600 dark:text-sky-400'
                }`}
              >
                {percentage}%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight">
              {meta.label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {dp.verified}/{dp.total} item
            </p>

            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentage === 100 ? 'bg-emerald-500' : 'bg-sky-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Status indicators */}
            <div className="flex gap-2 mt-2 text-xs text-gray-500">
              {dp.pending > 0 && (
                <span className="text-amber-600 dark:text-amber-400">⏳ {dp.pending}</span>
              )}
              {dp.rejected > 0 && (
                <span className="text-red-600 dark:text-red-400">✗ {dp.rejected}</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
