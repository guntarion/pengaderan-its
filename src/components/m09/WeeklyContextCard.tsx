'use client';

/**
 * src/components/m09/WeeklyContextCard.tsx
 * NAWASENA M09 — Weekly context card for KP Weekly Debrief.
 *
 * Displays avg mood, red flag breakdown, and anecdote snippets
 * computed from the week's daily logs.
 */

import { TrendingUp, AlertTriangle, BookOpen, Calendar } from 'lucide-react';

interface RedFlagBreakdown {
  INJURY: number;
  SHUTDOWN: number;
  MENANGIS: number;
  KONFLIK: number;
  WITHDRAW: number;
  LAINNYA: number;
}

interface WeeklyContext {
  weekNumber: number;
  yearNumber: number;
  avgMood: number | null;
  dailyCount: number;
  redFlagBreakdown: RedFlagBreakdown;
  anecdoteList: Array<{ date: string; note: string }>;
}

interface WeeklyContextCardProps {
  context: WeeklyContext | null;
}

const RED_FLAG_LABELS: Record<keyof RedFlagBreakdown, string> = {
  INJURY: 'Cedera Fisik',
  SHUTDOWN: 'Shutdown',
  MENANGIS: 'Menangis',
  KONFLIK: 'Konflik',
  WITHDRAW: 'Withdraw',
  LAINNYA: 'Lainnya',
};

const RED_FLAG_SEVERITY: Record<keyof RedFlagBreakdown, 'severe' | 'normal'> = {
  INJURY: 'severe',
  SHUTDOWN: 'severe',
  MENANGIS: 'normal',
  KONFLIK: 'normal',
  WITHDRAW: 'normal',
  LAINNYA: 'normal',
};

export function WeeklyContextCard({ context }: WeeklyContextCardProps) {
  if (!context) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
        <p className="text-sm text-gray-400">Belum ada data harian untuk minggu ini</p>
      </div>
    );
  }

  const totalRedFlags = Object.values(context.redFlagBreakdown).reduce((a, b) => a + b, 0);
  const activeFlags = Object.entries(context.redFlagBreakdown).filter(([, count]) => count > 0);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Avg mood */}
        <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-3 text-center">
          <TrendingUp className="h-4 w-4 text-sky-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-sky-600 dark:text-sky-400">
            {context.avgMood !== null ? context.avgMood.toFixed(1) : '-'}
          </p>
          <p className="text-xs text-gray-400">Avg Mood</p>
        </div>

        {/* Daily count */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
          <Calendar className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {context.dailyCount}
          </p>
          <p className="text-xs text-gray-400">Hari Diisi</p>
        </div>

        {/* Red flags total */}
        <div
          className={`rounded-xl p-3 text-center ${
            totalRedFlags > 0
              ? 'bg-red-50 dark:bg-red-900/20'
              : 'bg-gray-50 dark:bg-gray-800/50'
          }`}
        >
          <AlertTriangle
            className={`h-4 w-4 mx-auto mb-1 ${
              totalRedFlags > 0 ? 'text-red-500' : 'text-gray-300'
            }`}
          />
          <p
            className={`text-xl font-bold ${
              totalRedFlags > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
            }`}
          >
            {totalRedFlags}
          </p>
          <p className="text-xs text-gray-400">Red Flags</p>
        </div>
      </div>

      {/* Red flag breakdown */}
      {activeFlags.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Rincian Red Flag
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeFlags.map(([flag, count]) => {
              const key = flag as keyof RedFlagBreakdown;
              const isSevere = RED_FLAG_SEVERITY[key] === 'severe';
              return (
                <span
                  key={flag}
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    isSevere
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                  }`}
                >
                  {RED_FLAG_LABELS[key]} ×{count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Anecdote snippets */}
      {context.anecdoteList.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-gray-400" />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Catatan Harian ({context.anecdoteList.length})
            </p>
          </div>
          <div className="space-y-1.5">
            {context.anecdoteList.slice(0, 3).map((anecdote, i) => (
              <div
                key={i}
                className="text-xs text-gray-600 dark:text-gray-400 border-l-2 border-sky-200 dark:border-sky-800 pl-2"
              >
                <span className="text-gray-400">
                  {new Date(anecdote.date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  —{' '}
                </span>
                {anecdote.note.length > 120
                  ? anecdote.note.substring(0, 120) + '...'
                  : anecdote.note}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400 text-right">
        Minggu ke-{context.weekNumber}, {context.yearNumber}
      </div>
    </div>
  );
}
