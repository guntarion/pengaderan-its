/**
 * src/components/dashboard/charts/LineChart.tsx
 * Trend line chart wrapper using Recharts.
 */

'use client';

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface LineChartProps {
  data: Array<Record<string, number | string>>;
  lines: Array<{
    key: string;
    label: string;
    color?: string;
  }>;
  xAxisKey?: string;
  height?: number;
  className?: string;
}

const DEFAULT_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export function LineChartWidget({
  data,
  lines,
  xAxisKey = 'label',
  height = 200,
  className = '',
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-gray-400 ${className}`}
        style={{ height }}
      >
        Belum ada data
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              color: '#f1f5f9',
              fontSize: '12px',
            }}
          />
          {lines.length > 1 && <Legend />}
          {lines.map((line, i) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
