/**
 * src/components/event/NPSAggregateCards.tsx
 * 5 aggregate stat cards for NPS data (OC view).
 * Shows net promoter score, avg satisfaction, avg safety, avg meaningful, n.
 */

import React from 'react';

interface NPSAggregateCardsProps {
  nResponses: number;
  avgNpsScore: number;
  netPromoterScore: number;
  avgFeltSafe: number;
  avgMeaningful: number;
}

function StatCard({ label, value, sub, colorClass }: { label: string; value: string; sub?: string; colorClass: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm text-center">
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-2">{label}</p>
    </div>
  );
}

export function NPSAggregateCards({
  nResponses,
  avgNpsScore,
  netPromoterScore,
  avgFeltSafe,
  avgMeaningful,
}: NPSAggregateCardsProps) {
  const npsColor =
    netPromoterScore >= 50
      ? 'text-emerald-600 dark:text-emerald-400'
      : netPromoterScore >= 0
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-500 dark:text-red-400';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatCard
        label="Net Promoter Score"
        value={`${netPromoterScore > 0 ? '+' : ''}${netPromoterScore}`}
        sub="Promoter % - Detractor %"
        colorClass={npsColor}
      />
      <StatCard
        label="Avg Kepuasan"
        value={avgNpsScore.toFixed(1)}
        sub="Skala 0–10"
        colorClass="text-sky-600 dark:text-sky-400"
      />
      <StatCard
        label="Avg Keamanan"
        value={avgFeltSafe.toFixed(1)}
        sub="Skala 1–5"
        colorClass="text-blue-600 dark:text-blue-400"
      />
      <StatCard
        label="Avg Kebermaknaan"
        value={avgMeaningful.toFixed(1)}
        sub="Skala 1–5"
        colorClass="text-violet-600 dark:text-violet-400"
      />
      <StatCard
        label="Total Responden"
        value={String(nResponses)}
        colorClass="text-gray-700 dark:text-gray-300"
      />
    </div>
  );
}
