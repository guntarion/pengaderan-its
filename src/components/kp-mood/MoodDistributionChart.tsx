/**
 * src/components/kp-mood/MoodDistributionChart.tsx
 * NAWASENA M04 — Bar chart showing mood distribution for KP group.
 */

'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MoodDistributionChartProps {
  distribution: Record<string, number>;
}

const MOOD_COLORS: Record<string, string> = {
  '1': '#ef4444', // red-500
  '2': '#f97316', // orange-500
  '3': '#eab308', // yellow-500
  '4': '#14b8a6', // teal-500
  '5': '#22c55e', // green-500
};

const MOOD_EMOJIS: Record<string, string> = {
  '1': '😞',
  '2': '😕',
  '3': '😐',
  '4': '😊',
  '5': '😄',
};

export function MoodDistributionChart({ distribution }: MoodDistributionChartProps) {
  const data = ['1', '2', '3', '4', '5'].map((key) => ({
    mood: key,
    count: distribution[key] ?? 0,
    emoji: MOOD_EMOJIS[key],
  }));

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-sky-100 dark:border-sky-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Distribusi Mood
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
            Belum ada data mood hari ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="emoji"
                tick={{ fontSize: 18 }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                width={28}
              />
              <Tooltip
                formatter={(value, _name, props) => {
                  const mood = (props.payload as { mood: string }).mood;
                  return [`${value} orang`, `Mood ${mood} ${MOOD_EMOJIS[mood] ?? ''}`];
                }}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e0f2fe',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.mood}
                    fill={MOOD_COLORS[entry.mood]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
