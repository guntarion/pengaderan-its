'use client';

/**
 * src/components/event-execution/AttendanceLiveCounter.tsx
 * NAWASENA M08 — Live attendance stat cards that auto-refresh.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { Users2Icon, CheckCircle2Icon, ClockIcon, AlertCircleIcon, XCircleIcon } from 'lucide-react';

interface AttendanceStats {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  walkin: number;
  confirmed: number;
}

interface AttendanceLiveCounterProps {
  instanceId: string;
  refreshInterval?: number; // ms, default 30000
  onStatsChange?: (stats: AttendanceStats) => void;
}

const STAT_CARDS = [
  { key: 'hadir', label: 'Hadir', icon: CheckCircle2Icon, cls: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  { key: 'izin', label: 'Izin', icon: ClockIcon, cls: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 'sakit', label: 'Sakit', icon: AlertCircleIcon, cls: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { key: 'alpa', label: 'Alpa', icon: XCircleIcon, cls: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
] as const;

export function AttendanceLiveCounter({
  instanceId,
  refreshInterval = 30_000,
  onStatsChange,
}: AttendanceLiveCounterProps) {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}/attendance`);
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      const newStats: AttendanceStats = data.data?.stats;
      setStats(newStats);
      setLastRefreshed(new Date());
      onStatsChange?.(newStats);
    } catch (err) {
      toast.apiError(err);
    }
  }, [instanceId, onStatsChange]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStats, refreshInterval]);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_CARDS.map((c) => (
          <div key={c.key} className="bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900 p-3 animate-pulse h-16" />
        ))}
      </div>
    );
  }

  const pct = stats.confirmed > 0 ? Math.round((stats.hadir / stats.confirmed) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
        <Users2Icon className="h-4 w-4 text-sky-500" />
        <span>
          <strong>{stats.hadir}</strong> dari <strong>{stats.confirmed}</strong> hadir
          <span className="text-gray-400 dark:text-gray-500 ml-1">({pct}%)</span>
        </span>
        {stats.walkin > 0 && (
          <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">
            {stats.walkin} walkin
          </span>
        )}
        {lastRefreshed && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
            Update {lastRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, cls, bg }) => (
          <div
            key={key}
            className={`${bg} rounded-xl border border-sky-100 dark:border-sky-900 p-3 flex items-center gap-3`}
          >
            <Icon className={`h-5 w-5 ${cls} shrink-0`} />
            <div>
              <p className={`text-lg font-bold ${cls}`}>{stats[key]}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
