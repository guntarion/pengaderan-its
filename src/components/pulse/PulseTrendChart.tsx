'use client';

/**
 * src/components/pulse/PulseTrendChart.tsx
 * NAWASENA M04 — Pulse mood trend line chart using Recharts.
 *
 * Displays mood over time with colored dots per mood level.
 * Supports 7/14/30 day window toggle.
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface PulseTrendPoint {
  id: string;
  mood: number;
  emoji: string;
  comment: string | null;
  recordedAt: string | Date;
  localDate: string | Date;
}

interface PulseTrendChartProps {
  pulses: PulseTrendPoint[];
  days: number;
  onDaysChange?: (days: number) => void;
}

const DAY_OPTIONS = [7, 14, 30];

const MOOD_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#3b82f6',
};

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: { mood: number; emoji: string };
}) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;

  return (
    <text x={cx} y={cy + 6} textAnchor="middle" fontSize={16}>
      {payload.emoji}
    </text>
  );
}

export function PulseTrendChart({ pulses, days, onDaysChange }: PulseTrendChartProps) {
  const chartData = pulses.map((p) => ({
    date: format(new Date(p.recordedAt), 'dd MMM', { locale: idLocale }),
    mood: p.mood,
    emoji: p.emoji,
    comment: p.comment,
    color: MOOD_COLORS[p.mood] ?? '#94a3b8',
  }));

  return (
    <div className="space-y-4">
      {/* Day toggle */}
      {onDaysChange && (
        <div className="flex gap-2">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                days === d
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 text-gray-600 dark:text-gray-400 hover:bg-sky-50'
              }`}
            >
              {d} hari
            </button>
          ))}
        </div>
      )}

      {chartData.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400 dark:text-gray-500">
          <span className="text-4xl mb-3">📊</span>
          <p className="text-sm">Belum ada data pulse untuk {days} hari terakhir.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 20, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-slate-700" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-800 rounded-xl p-3 shadow-lg text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-xl">{d.emoji}</span>
                      <span className="text-gray-800 dark:text-gray-200">Mood {d.mood}/5</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{d.date}</p>
                    {d.comment && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-[200px]">
                        {d.comment}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <ReferenceLine y={3} stroke="#e2e8f0" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="mood"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 6, fill: '#0ea5e9' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Mood legend */}
      <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400">
        {[1, 2, 3, 4, 5].map((m) => (
          <div key={m} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MOOD_COLORS[m] }} />
            <span>Mood {m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
