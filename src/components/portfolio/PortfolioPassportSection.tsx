'use client';

/**
 * src/components/portfolio/PortfolioPassportSection.tsx
 * NAWASENA M07 — Portfolio section: Passport Digital badge summary (M05 placeholder).
 */

import { AwardIcon } from 'lucide-react';

interface PortfolioPassportSectionProps {
  completedBadges: number;
  totalBadges: number;
}

export function PortfolioPassportSection({
  completedBadges,
  totalBadges,
}: PortfolioPassportSectionProps) {
  const pct = totalBadges > 0 ? Math.round((completedBadges / totalBadges) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AwardIcon className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Passport Digital</h2>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Badge selesai</span>
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {completedBadges} / {totalBadges}
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5">
          <div
            className="bg-amber-500 h-2.5 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{pct}% badge diselesaikan</p>
      </div>
    </div>
  );
}
