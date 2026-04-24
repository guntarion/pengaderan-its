/**
 * src/components/dashboard/widgets/__tests__/widgets.test.tsx
 * Smoke render tests for all M13 Dashboard widgets.
 *
 * Tests:
 * - EmptyState renders default / error variants
 * - PartialDataBadge renders
 * - WidgetErrorBoundary catches errors and renders fallback
 * - MoodCard — loading / data / empty states
 * - AlertsPanel — loading / data / empty / error states
 * - KPIMini — loading / data states
 * - ComplianceIndicator — loading / data states
 * - ProgressRing — renders with percent
 * - EventListCard — loading / data / empty states
 * - RedFlagList — loading / data / empty states
 * - KirkpatrickSnapshot — loading / data states
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock next/navigation (used by AlertsPanel, KPIMini, RedFlagList, MoodCard)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock recharts (used by Sparkline, LineChart, BarChart)
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Cell: () => null,
}));

// Mock @/lib/toast
vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    apiError: vi.fn(),
  },
}));

// Mock @/lib/logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { EmptyState } from '../EmptyState';
import { PartialDataBadge } from '../PartialDataBadge';
import { WidgetErrorBoundary } from '../WidgetErrorBoundary';
import { MoodCard } from '../MoodCard';
import { AlertsPanel } from '../AlertsPanel';
import { KPIMini } from '../KPIMini';
import { ComplianceIndicator } from '../ComplianceIndicator';
import { ProgressRing } from '../ProgressRing';
import { EventListCard } from '../EventListCard';
import { RedFlagList } from '../RedFlagList';
import { KirkpatrickSnapshot } from '../KirkpatrickSnapshot';

// ─── EmptyState ───────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders default variant with default text', () => {
    render(<EmptyState />);
    expect(screen.getByText('Belum ada data')).toBeInTheDocument();
  });

  it('renders error variant', () => {
    render(<EmptyState variant="error" />);
    expect(screen.getByText('Widget tidak dapat dimuat')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(<EmptyState title="Custom Title" description="Custom Description" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Description')).toBeInTheDocument();
  });
});

// ─── PartialDataBadge ─────────────────────────────────────────────────────────

describe('PartialDataBadge', () => {
  it('renders badge with reason text', () => {
    render(<PartialDataBadge reason="Data tidak lengkap" />);
    // Badge should be visible (look for the "Parsial" or similar text)
    const el = document.querySelector('[class*="amber"], [class*="partial"]') ??
      document.querySelector('span');
    expect(el).toBeTruthy();
  });
});

// ─── WidgetErrorBoundary ──────────────────────────────────────────────────────

function ThrowingChild(): never {
  throw new Error('Test render error');
}

describe('WidgetErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <WidgetErrorBoundary>
        <span>Safe Content</span>
      </WidgetErrorBoundary>,
    );
    expect(screen.getByText('Safe Content')).toBeInTheDocument();
  });

  it('renders fallback when child throws', () => {
    // Suppress expected error output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <WidgetErrorBoundary widgetName="TestWidget">
        <ThrowingChild />
      </WidgetErrorBoundary>,
    );
    expect(screen.getByText(/Widget tidak dapat dimuat/)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('renders custom fallback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <WidgetErrorBoundary fallback={<div>Custom Fallback</div>}>
        <ThrowingChild />
      </WidgetErrorBoundary>,
    );
    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});

// ─── MoodCard ─────────────────────────────────────────────────────────────────

describe('MoodCard', () => {
  it('renders loading skeleton', () => {
    render(<MoodCard state={{ status: 'loading' }} />);
    // Loading renders pulse skeleton divs — no text
    const el = document.querySelector('.animate-pulse');
    expect(el).toBeTruthy();
  });

  it('renders mood data', () => {
    render(
      <MoodCard
        state={{
          status: 'data',
          data: { avg: 3.8, count: 42, trend7d: [3.5, 3.6, 3.7, 3.8, 3.9, 3.7, 3.8] },
        }}
      />,
    );
    expect(screen.getByText('3.8')).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<MoodCard state={{ status: 'empty' }} />);
    // MoodCard shows EmptyState with a description about mood data
    expect(screen.getByText(/ada data mood/i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<MoodCard state={{ status: 'error', error: 'Network error' }} />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});

// ─── AlertsPanel ─────────────────────────────────────────────────────────────

const mockAlerts = [
  {
    id: 'alert-1',
    type: 'PULSE_LOW_3D',
    severity: 'HIGH' as const,
    status: 'ACTIVE' as const,
    title: 'Pulse Rendah 3 Hari',
    targetUrl: '/admin/pulse/1',
    firstSeenAt: new Date().toISOString(),
    computedAt: new Date().toISOString(),
  },
];

describe('AlertsPanel', () => {
  it('renders loading state', () => {
    render(<AlertsPanel state={{ status: 'loading' }} />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders alert list with data', () => {
    render(<AlertsPanel state={{ status: 'data', data: mockAlerts }} />);
    expect(screen.getByText('Pulse Rendah 3 Hari')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('renders empty state when no alerts', () => {
    render(<AlertsPanel state={{ status: 'empty' }} />);
    expect(screen.getByText('Tidak ada alert aktif')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<AlertsPanel state={{ status: 'error', error: 'Gagal memuat alert' }} />);
    expect(screen.getByText('Gagal memuat alert')).toBeInTheDocument();
  });
});

// ─── KPIMini ─────────────────────────────────────────────────────────────────

describe('KPIMini', () => {
  it('renders loading state', () => {
    render(<KPIMini state={{ status: 'loading' }} />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders KPI data with value and target', () => {
    render(
      <KPIMini
        state={{
          status: 'data',
          data: {
            kpiDefId: 'kpi-1',
            label: 'NPS Avg 30d',
            value: 7.5,
            target: 8.0,
            unit: 'pts',
            period: 'MONTHLY',
          },
        }}
      />,
    );
    expect(screen.getByText('NPS Avg 30d')).toBeInTheDocument();
    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText('pts')).toBeInTheDocument();
  });

  it('renders null value as em dash', () => {
    render(
      <KPIMini
        state={{
          status: 'data',
          data: {
            kpiDefId: 'kpi-2',
            label: 'Empty KPI',
            value: null,
            target: null,
            period: 'WEEKLY',
          },
        }}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

// ─── ComplianceIndicator ──────────────────────────────────────────────────────

describe('ComplianceIndicator', () => {
  it('renders loading state', () => {
    render(<ComplianceIndicator state={{ status: 'loading' }} />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders compliance data', () => {
    render(
      <ComplianceIndicator
        state={{
          status: 'data',
          data: {
            paktaPanitiaPercent: 85,
            socialContractPercent: 72,
            forbiddenActViolations: 0,
            permen55Checklist: [
              { id: '1', label: 'Ketua panitia telah ditunjuk', status: 'green' },
              { id: '2', label: 'SK panitia tersedia', status: 'yellow' },
            ],
          },
        }}
      />,
    );
    expect(screen.getByText('Pakta Panitia Signed')).toBeInTheDocument();
    expect(screen.getByText('Social Contract Maba Signed')).toBeInTheDocument();
    expect(screen.getByText('Ketua panitia telah ditunjuk')).toBeInTheDocument();
  });

  it('shows FA violations badge when violations > 0', () => {
    render(
      <ComplianceIndicator
        state={{
          status: 'data',
          data: {
            paktaPanitiaPercent: 90,
            socialContractPercent: 90,
            forbiddenActViolations: 3,
            permen55Checklist: [],
          },
        }}
      />,
    );
    expect(screen.getByText(/Pelanggaran Forbidden Acts/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

// ─── ProgressRing ─────────────────────────────────────────────────────────────

describe('ProgressRing', () => {
  it('renders with percent and label', () => {
    render(<ProgressRing percent={75} label="Passport" />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Passport')).toBeInTheDocument();
  });

  it('clamps value to 0-100', () => {
    render(<ProgressRing percent={150} label="Over" />);
    expect(screen.getByText('100%')).toBeInTheDocument();

    render(<ProgressRing percent={-10} label="Under" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders sublabel when provided', () => {
    render(<ProgressRing percent={50} label="Progress" sublabel="50 / 100" />);
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
  });
});

// ─── EventListCard ────────────────────────────────────────────────────────────

describe('EventListCard', () => {
  it('renders loading state', () => {
    render(<EventListCard state={{ status: 'loading' }} />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders event list with data', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    render(
      <EventListCard
        state={{
          status: 'data',
          data: [
            {
              id: 'ev-1',
              title: 'Orientasi Kampus',
              startTime: futureDate,
              location: 'Aula ITS',
              rsvpStatus: 'CONFIRMED',
            },
          ],
        }}
      />,
    );
    expect(screen.getByText('Orientasi Kampus')).toBeInTheDocument();
    expect(screen.getByText('Aula ITS')).toBeInTheDocument();
  });

  it('renders empty state when no events', () => {
    render(<EventListCard state={{ status: 'empty' }} />);
    expect(screen.getByText('Tidak ada kegiatan dalam 7 hari')).toBeInTheDocument();
  });
});

// ─── RedFlagList ──────────────────────────────────────────────────────────────

describe('RedFlagList', () => {
  it('renders loading state', () => {
    render(<RedFlagList state={{ status: 'loading' }} />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders alert list with data', () => {
    render(<RedFlagList state={{ status: 'data', data: mockAlerts }} />);
    expect(screen.getByText('Pulse Rendah 3 Hari')).toBeInTheDocument();
    // Badge count
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders empty state when no alerts', () => {
    render(<RedFlagList state={{ status: 'empty' }} />);
    expect(screen.getByText('Tidak ada red flag aktif')).toBeInTheDocument();
  });
});

// ─── KirkpatrickSnapshot ─────────────────────────────────────────────────────

describe('KirkpatrickSnapshot', () => {
  it('renders loading state', () => {
    render(<KirkpatrickSnapshot state={{ status: 'loading' }} />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders all 4 Kirkpatrick levels', () => {
    render(
      <KirkpatrickSnapshot
        state={{
          status: 'data',
          data: {
            cohortId: 'cohort-1',
            computedAt: new Date(),
            levels: [
              { level: 1, label: 'Reaksi (L1)', value: 8.2, target: 8.0, trend30d: [7.8, 8.0, 8.2], partial: false, source: 'M06' },
              { level: 2, label: 'Pembelajaran (L2)', value: 3.1, target: 3.0, trend30d: [3.0, 3.1], partial: false, source: 'M04/M05' },
              { level: 3, label: 'Perilaku (L3)', value: 78, target: 80.0, trend30d: [75, 78], partial: false, source: 'M06/M08' },
              { level: 4, label: 'Hasil (L4)', value: 92, target: 90.0, trend30d: [90, 92], partial: true, partialReason: 'SIAKAD pending', source: 'M01' },
            ],
          },
        }}
      />,
    );
    expect(screen.getByText('Reaksi (L1)')).toBeInTheDocument();
    expect(screen.getByText('Pembelajaran (L2)')).toBeInTheDocument();
    expect(screen.getByText('Perilaku (L3)')).toBeInTheDocument();
    expect(screen.getByText('Hasil (L4)')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<KirkpatrickSnapshot state={{ status: 'empty' }} />);
    // Should render empty gracefully
    const container = document.querySelector('[class*="rounded-2xl"]');
    expect(container).toBeTruthy();
  });
});
