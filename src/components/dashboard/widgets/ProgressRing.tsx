/**
 * src/components/dashboard/widgets/ProgressRing.tsx
 * Circular progress ring for passport completion, streak, etc.
 */

'use client';

import React from 'react';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

interface ProgressRingProps {
  percent: number;
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

function ProgressRingInner({
  percent,
  label,
  sublabel,
  size = 80,
  strokeWidth = 6,
  color = '#0ea5e9',
  className = '',
}: ProgressRingProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            className="dark:stroke-slate-700"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
            {clampedPercent.toFixed(0)}%
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">{label}</p>
      {sublabel && <p className="text-xs text-gray-400 dark:text-gray-500">{sublabel}</p>}
    </div>
  );
}

export function ProgressRing(props: ProgressRingProps) {
  return (
    <WidgetErrorBoundary widgetName="ProgressRing">
      <ProgressRingInner {...props} />
    </WidgetErrorBoundary>
  );
}
