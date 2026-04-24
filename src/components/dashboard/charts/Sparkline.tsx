/**
 * src/components/dashboard/charts/Sparkline.tsx
 * Minimal inline sparkline chart using Recharts.
 */

'use client';

import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  showTooltip?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  color = '#0ea5e9',
  height = 40,
  showTooltip = false,
  className = '',
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-gray-400 ${className}`}
        style={{ height }}
      >
        —
      </div>
    );
  }

  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          {showTooltip && (
            <Tooltip
              contentStyle={{
                background: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '11px',
              }}
              formatter={(val: unknown) => [(val as number).toFixed(1), 'Nilai'] as [string, string]}
              labelFormatter={() => ''}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={showTooltip ? { r: 3, fill: color } : false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
