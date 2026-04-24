/**
 * src/components/kp-mood/MoodAggregateCard.tsx
 * NAWASENA M04 — Summary card showing KP group's average mood.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MoodAggregateCardProps {
  avgMood: number | null;
  totalCheckedIn: number;
  groupSize: number;
  notCheckedInCount: number;
}

function getMoodEmoji(avgMood: number | null): string {
  if (avgMood === null) return '—';
  if (avgMood <= 1.5) return '😞';
  if (avgMood <= 2.5) return '😕';
  if (avgMood <= 3.5) return '😐';
  if (avgMood <= 4.5) return '😊';
  return '😄';
}

function getMoodColor(avgMood: number | null): string {
  if (avgMood === null) return 'text-gray-400';
  if (avgMood <= 2) return 'text-red-500';
  if (avgMood <= 3) return 'text-amber-500';
  if (avgMood <= 4) return 'text-sky-500';
  return 'text-emerald-500';
}

export function MoodAggregateCard({
  avgMood,
  totalCheckedIn,
  groupSize,
  notCheckedInCount,
}: MoodAggregateCardProps) {
  const progressPercent =
    groupSize > 0 ? Math.round((totalCheckedIn / groupSize) * 100) : 0;

  return (
    <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Mood Rata-rata Kelompok
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Mood emoji + number */}
          <div className="flex flex-col items-center">
            <span className="text-5xl leading-none" role="img" aria-label={`Mood ${avgMood}`}>
              {getMoodEmoji(avgMood)}
            </span>
            <span className={`mt-1 text-2xl font-bold tabular-nums ${getMoodColor(avgMood)}`}>
              {avgMood !== null ? avgMood.toFixed(1) : '—'}
            </span>
          </div>

          {/* Check-in progress */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Check-in hari ini</span>
              <span className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                {totalCheckedIn}/{groupSize}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-sky-100 dark:bg-sky-900/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>{progressPercent}% sudah check-in</span>
              {notCheckedInCount > 0 && (
                <span className="text-amber-500 dark:text-amber-400">
                  {notCheckedInCount} belum
                </span>
              )}
            </div>
          </div>
        </div>

        {/* No data state */}
        {avgMood === null && (
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">
            Belum ada anggota yang check-in hari ini.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
