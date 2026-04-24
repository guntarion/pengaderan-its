'use client';

/**
 * src/components/triwulan/SnapshotIncidentSummary.tsx
 * NAWASENA M14 — Displays incidents + red flags + anon reports summary.
 */

import { Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface SnapshotIncidentSummaryProps {
  incidentsData: Record<string, unknown> | null;
  redFlagsData: Record<string, unknown> | null;
  anonData: Record<string, unknown> | null;
  forbiddenActsData: Record<string, unknown> | null;
  className?: string;
}

function StatPill({
  label,
  value,
  variant = 'neutral',
}: {
  label: string;
  value: number | string;
  variant?: 'neutral' | 'warning' | 'danger' | 'ok';
}) {
  const colorMap = {
    neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  };
  return (
    <div className={`rounded-xl p-3 ${colorMap[variant]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}

export function SnapshotIncidentSummary({
  incidentsData,
  redFlagsData,
  anonData,
  forbiddenActsData,
  className = '',
}: SnapshotIncidentSummaryProps) {
  const incTotal = (incidentsData?.total as number) ?? 0;
  const incRed = (incidentsData?.bySeverity as Record<string, number>)?.RED ?? 0;
  const incOpen = (incidentsData?.openCount as number) ?? 0;

  const rfActive = (redFlagsData?.activeCount as number) ?? 0;
  const rfUrgent = (redFlagsData?.byLevel as Record<string, number>)?.URGENT ?? 0;

  const anonTotal = (anonData?.total as number) ?? 0;
  const anonOpen = (anonData?.openCount as number) ?? 0;

  const fbCount = (forbiddenActsData as { violations?: unknown[] } | null)?.violations?.length ?? 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Incidents */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-sky-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Insiden</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Total" value={incTotal} variant="neutral" />
          <StatPill
            label="Merah"
            value={incRed}
            variant={incRed > 0 ? 'danger' : 'ok'}
          />
          <StatPill
            label="Terbuka"
            value={incOpen}
            variant={incOpen > 0 ? 'warning' : 'ok'}
          />
        </div>
      </div>

      {/* Red flags */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Red Flag</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatPill label="Aktif" value={rfActive} variant={rfActive > 0 ? 'warning' : 'ok'} />
          <StatPill label="Urgen" value={rfUrgent} variant={rfUrgent > 0 ? 'danger' : 'ok'} />
        </div>
      </div>

      {/* Anon reports */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <EyeOff className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Laporan Anonim
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatPill label="Total" value={anonTotal} variant="neutral" />
          <StatPill
            label="Terbuka"
            value={anonOpen}
            variant={anonOpen > 0 ? 'warning' : 'ok'}
          />
        </div>
      </div>

      {/* Forbidden acts */}
      {fbCount > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">
              Tindakan Terlarang
            </span>
          </div>
          <StatPill
            label="Pelanggaran terdeteksi"
            value={fbCount}
            variant="danger"
          />
        </div>
      )}
    </div>
  );
}
