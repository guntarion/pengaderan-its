/**
 * src/lib/triwulan/pdf/chart-generator.ts
 * NAWASENA M14 — Generates SVG-based chart data for react-pdf/renderer.
 *
 * Since @react-pdf/renderer renders in Node, we generate pure SVG path data
 * rather than using browser-based charting libraries.
 * Charts are simple bar charts suitable for PDF output.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('m14/pdf/chart-generator');

export interface BarChartData {
  labels: string[];
  values: number[];
  maxValue: number;
  svgWidth: number;
  svgHeight: number;
  bars: BarSegment[];
}

export interface BarSegment {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  value: number;
  color: string;
}

const CHART_COLORS = ['#0ea5e9', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

/**
 * Generate bar chart data for KPI metrics.
 * Returns null if data is insufficient to render a meaningful chart.
 */
export function generateKPIBarChart(
  kpiData: Record<string, unknown> | null
): BarChartData | null {
  if (!kpiData) {
    log.warn('KPI data is null — skipping chart generation');
    return null;
  }

  try {
    const metrics: { label: string; value: number | null }[] = [
      { label: 'Retensi', value: (kpiData.retention as { value: number } | null)?.value ?? null },
      { label: 'NPS', value: (kpiData.npsAvg as { value: number } | null)?.value ?? null },
      { label: 'Jurnal', value: (kpiData.journalRate as { value: number } | null)?.value ?? null },
      { label: 'Kehadiran', value: (kpiData.attendanceRate as { value: number } | null)?.value ?? null },
      { label: 'Passport', value: (kpiData.passportCompletionRate as { value: number } | null)?.value ?? null },
    ];

    const validMetrics = metrics.filter((m) => m.value !== null) as {
      label: string;
      value: number;
    }[];

    if (validMetrics.length === 0) {
      log.warn('No valid KPI metrics for chart');
      return null;
    }

    const svgWidth = 400;
    const svgHeight = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    const maxValue = 100; // percentages
    const barWidth = Math.floor(chartWidth / validMetrics.length) - 8;

    const bars: BarSegment[] = validMetrics.map((metric, idx) => {
      const normalizedValue = Math.min(100, Math.max(0, metric.value));
      const barHeight = Math.max(2, (normalizedValue / maxValue) * chartHeight);
      const x = padding.left + idx * (chartWidth / validMetrics.length) + 4;
      const y = padding.top + chartHeight - barHeight;

      return {
        x,
        y,
        width: barWidth,
        height: barHeight,
        label: metric.label,
        value: metric.value,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
    });

    return {
      labels: validMetrics.map((m) => m.label),
      values: validMetrics.map((m) => m.value),
      maxValue,
      svgWidth,
      svgHeight,
      bars,
    };
  } catch (err) {
    log.error('KPI chart generation failed', { error: err });
    return null;
  }
}

/**
 * Generate a simple trend sparkline path string.
 * Returns null if trend data is insufficient.
 */
export function generateTrendPath(
  values: number[],
  width: number,
  height: number
): string | null {
  if (!values || values.length < 2) return null;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - minVal) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${points.join(' L ')}`;
}
