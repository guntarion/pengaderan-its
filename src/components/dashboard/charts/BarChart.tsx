/**
 * src/components/dashboard/charts/BarChart.tsx
 * Bar chart wrapper using Recharts.
 */

'use client';

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface BarChartProps {
  data: Array<Record<string, number | string>>;
  dataKey: string;
  xAxisKey?: string;
  color?: string;
  height?: number;
  className?: string;
}

export function BarChartWidget({
  data,
  dataKey,
  xAxisKey = 'label',
  color = '#0ea5e9',
  height = 160,
  className = '',
}: BarChartProps) {
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
        <RechartsBarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
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
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
