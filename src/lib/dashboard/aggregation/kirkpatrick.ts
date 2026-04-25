/**
 * src/lib/dashboard/aggregation/kirkpatrick.ts
 * Kirkpatrick L1-L4 compute functions for M13 Dashboard.
 *
 * L1 Reaction  — Average EventNPS score last 30d
 * L2 Learning  — Average RubrikScore per dimension
 * L3 Behavior  — Attendance participation rate
 * L4 Results   — Retention + LKMM-TD placeholder (partial)
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { daysAgo, round2 } from './aggregation-helpers';

const log = createLogger('m13/kirkpatrick');

export interface KirkpatrickLevel {
  level: 1 | 2 | 3 | 4;
  label: string;
  value: number | null;
  target: number | null;
  trend30d: number[];
  partial: boolean;
  partialReason?: string;
  source: string;
}

export interface KirkpatrickSnapshot {
  cohortId: string;
  computedAt: Date;
  levels: KirkpatrickLevel[];
}

/**
 * L1 Reaction: average EventNPS score last 30 days for the cohort.
 */
export async function computeL1Reaction(
  cohortId: string,
): Promise<KirkpatrickLevel> {
  const start = Date.now();
  const since = daysAgo(30);

  try {
    const result = await prisma.eventNPS.aggregate({
      _avg: { npsScore: true },
      _count: { npsScore: true },
      where: {
        instance: { cohortId },
        recordedAt: { gte: since },
      },
    });

    const avg = round2(result._avg.npsScore ?? null);
    const count = (result._count as { npsScore?: number }).npsScore ?? 0;

    log.debug('L1 Reaction computed', { cohortId, avg, count, durationMs: Date.now() - start });

    return {
      level: 1,
      label: 'Reaksi (L1)',
      value: avg,
      target: 8.0, // NPS target
      trend30d: avg != null ? [avg] : [],
      partial: count < 5,
      partialReason: count < 5 ? 'Data NPS belum cukup (<5 responden)' : undefined,
      source: 'M06',
    };
  } catch (err) {
    log.error('L1 Reaction compute failed', { cohortId, error: err });
    return {
      level: 1,
      label: 'Reaksi (L1)',
      value: null,
      target: 8.0,
      trend30d: [],
      partial: true,
      partialReason: 'Gagal mengambil data NPS',
      source: 'M06',
    };
  }
}

/**
 * L2 Learning: average RubrikScore value for the cohort.
 */
export async function computeL2Learning(
  cohortId: string,
): Promise<KirkpatrickLevel> {
  const start = Date.now();

  try {
    const result = await prisma.rubrikScore.aggregate({
      _avg: { level: true },
      _count: { level: true },
      where: { cohortId },
    });

    const avg = round2(result._avg.level ?? null);
    const count = (result._count as { level?: number }).level ?? 0;

    log.debug('L2 Learning computed', { cohortId, avg, count, durationMs: Date.now() - start });

    return {
      level: 2,
      label: 'Pembelajaran (L2)',
      value: avg,
      target: 3.0, // rubrik level 1-4, target 3
      trend30d: avg != null ? [avg] : [],
      partial: count < 10,
      partialReason: count < 10 ? 'Data rubrik belum cukup (<10 penilaian)' : undefined,
      source: 'M04/M05',
    };
  } catch (err) {
    log.error('L2 Learning compute failed', { cohortId, error: err });
    return {
      level: 2,
      label: 'Pembelajaran (L2)',
      value: null,
      target: 3.0,
      trend30d: [],
      partial: true,
      partialReason: 'Gagal mengambil data rubrik',
      source: 'M04/M05',
    };
  }
}

/**
 * L3 Behavior: attendance participation rate for the cohort.
 */
export async function computeL3Behavior(
  cohortId: string,
): Promise<KirkpatrickLevel> {
  const start = Date.now();

  try {
    const [presentCount, totalCount] = await Promise.all([
      prisma.attendance.count({
        where: {
          instance: { cohortId },
          status: 'HADIR',
        },
      }),
      prisma.attendance.count({
        where: { instance: { cohortId } },
      }),
    ]);

    const participationRate = totalCount > 0 ? round2((presentCount / totalCount) * 100) : null;

    log.debug('L3 Behavior computed', {
      cohortId,
      present: presentCount,
      total: totalCount,
      rate: participationRate,
      durationMs: Date.now() - start,
    });

    return {
      level: 3,
      label: 'Perilaku (L3)',
      value: participationRate,
      target: 80.0, // 80% attendance target
      trend30d: participationRate != null ? [participationRate] : [],
      partial: totalCount < 10,
      partialReason: totalCount < 10 ? 'Data kehadiran belum cukup (<10 entries)' : undefined,
      source: 'M06/M08',
    };
  } catch (err) {
    log.error('L3 Behavior compute failed', { cohortId, error: err });
    return {
      level: 3,
      label: 'Perilaku (L3)',
      value: null,
      target: 80.0,
      trend30d: [],
      partial: true,
      partialReason: 'Gagal mengambil data kehadiran',
      source: 'M06/M08',
    };
  }
}

/**
 * L4 Results: retention + LKMM-TD placeholder.
 * LKMM-TD is a placeholder pending SIAKAD integration.
 */
export async function computeL4Results(
  cohortId: string,
  organizationId: string,
): Promise<KirkpatrickLevel> {
  const start = Date.now();

  try {
    const [activeCount, totalCount] = await Promise.all([
      prisma.user.count({
        where: {
          organizationId,
          currentCohortId: cohortId,
          status: 'ACTIVE',
        },
      }),
      prisma.user.count({
        where: {
          organizationId,
          currentCohortId: cohortId,
        },
      }),
    ]);

    const retentionRate = totalCount > 0 ? round2((activeCount / totalCount) * 100) : null;

    log.debug('L4 Results computed (retention only, LKMM-TD pending)', {
      cohortId,
      active: activeCount,
      total: totalCount,
      retention: retentionRate,
      durationMs: Date.now() - start,
    });

    return {
      level: 4,
      label: 'Hasil (L4)',
      value: retentionRate,
      target: 90.0, // 90% retention target
      trend30d: retentionRate != null ? [retentionRate] : [],
      partial: true, // Always partial — LKMM-TD pending
      partialReason: 'IPS & LKMM-TD menunggu integrasi SIAKAD',
      source: 'M01',
    };
  } catch (err) {
    log.error('L4 Results compute failed', { cohortId, error: err });
    return {
      level: 4,
      label: 'Hasil (L4)',
      value: null,
      target: 90.0,
      trend30d: [],
      partial: true,
      partialReason: 'Gagal mengambil data retensi',
      source: 'M01',
    };
  }
}

/**
 * Compute the full Kirkpatrick snapshot for a cohort.
 */
export async function computeKirkpatrickSnapshot(
  cohortId: string,
  organizationId: string,
): Promise<KirkpatrickSnapshot> {
  const start = Date.now();

  const [l1, l2, l3, l4] = await Promise.all([
    computeL1Reaction(cohortId),
    computeL2Learning(cohortId),
    computeL3Behavior(cohortId),
    computeL4Results(cohortId, organizationId),
  ]);

  log.info('Kirkpatrick snapshot computed', {
    cohortId,
    durationMs: Date.now() - start,
    partial: [l1, l2, l3, l4].some((l) => l.partial),
  });

  return {
    cohortId,
    computedAt: new Date(),
    levels: [l1, l2, l3, l4],
  };
}
