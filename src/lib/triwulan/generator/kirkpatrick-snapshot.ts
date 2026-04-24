/**
 * src/lib/triwulan/generator/kirkpatrick-snapshot.ts
 * NAWASENA M14 — Kirkpatrick L1-L4 Snapshot sub-generator.
 *
 * L1: EventNPS average (M06)
 * L2: RubrikScore average (M04)
 * L3: Retention / behavior change proxy (from KPI snapshot)
 * L4: Placeholder — IPS/LKMM eligibility not yet tracked in system
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('m14/generator/kirkpatrick-snapshot');

export interface KirkpatrickSnapshotData {
  L1: { npsAvg: number | null; eventCount: number } | null;
  L2: { rubricAvg: number | null; quizAvg: number | null } | null;
  L3: { retention: number | null; behaviorChangeProxy: number | null } | null;
  L4: { ipsAvg: number | null; lkmmTdEligibility: number | null; partial: true } | null;
}

export interface KirkpatrickSnapshotResult {
  data: KirkpatrickSnapshotData | null;
  missing?: string[];
}

export async function generateKirkpatrickSnapshot(
  cohortId: string,
  quarterStart: Date,
  quarterEnd: Date
): Promise<KirkpatrickSnapshotResult> {
  try {
    log.info('Generating Kirkpatrick snapshot', { cohortId, quarterStart, quarterEnd });

    const missing: string[] = [];

    // L1: EventNPS average from M06 (join via instance -> cohortId)
    const npsResult = await prisma.eventNPS.aggregate({
      where: {
        instance: { cohortId },
        createdAt: { gte: quarterStart, lte: quarterEnd },
      },
      _avg: { npsScore: true },
      _count: { id: true },
    });

    // L2: RubrikScore average from M04 (has cohortId directly)
    const rubrikResult = await prisma.rubrikScore.aggregate({
      where: {
        cohortId,
        scoredAt: { gte: quarterStart, lte: quarterEnd },
      },
      _avg: { level: true },
      _count: { id: true },
    });

    // L4 is always partial — no IPS/LKMM data in system yet
    missing.push('kirkpatrick.L4');

    const l1NpsAvg = npsResult._avg?.npsScore ?? null;
    const l2RubricAvg = rubrikResult._avg?.level ?? null;

    if (l1NpsAvg === null) missing.push('kirkpatrick.L1.npsAvg');
    if (l2RubricAvg === null) missing.push('kirkpatrick.L2.rubricAvg');

    const data: KirkpatrickSnapshotData = {
      L1: {
        npsAvg: l1NpsAvg,
        eventCount: npsResult._count.id,
      },
      L2: {
        rubricAvg: l2RubricAvg,
        quizAvg: null, // quiz avg not tracked in this system yet
      },
      L3: {
        retention: null, // will be populated from kpi snapshot merge
        behaviorChangeProxy: null,
      },
      L4: {
        ipsAvg: null,
        lkmmTdEligibility: null,
        partial: true,
      },
    };

    log.info('Kirkpatrick snapshot generated', { cohortId, missingCount: missing.length });
    return { data, missing: missing.length > 0 ? missing : undefined };
  } catch (err) {
    log.error('Kirkpatrick snapshot failed', { error: err, cohortId });
    return { data: null, missing: ['kirkpatrick'] };
  }
}
