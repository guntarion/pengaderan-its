/**
 * src/lib/triwulan/generator/redflag-snapshot.ts
 * NAWASENA M14 — Red Flag Snapshot sub-generator.
 *
 * Queries RedFlagAlert from M13, counts by severity for the quarter.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { AlertStatus, RedFlagSeverity } from '@prisma/client';

const log = createLogger('m14/generator/redflag-snapshot');

export interface RedFlagSnapshotData {
  activeCount: number;
  resolvedThisQuarter: number;
  bySeverity: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  longRunning: Array<{ type: string; days: number }>;
}

export interface RedFlagSnapshotResult {
  data: RedFlagSnapshotData | null;
  missing?: string[];
}

export async function generateRedflagSnapshot(
  cohortId: string,
  quarterStart: Date,
  quarterEnd: Date
): Promise<RedFlagSnapshotResult> {
  try {
    log.info('Generating red flag snapshot', { cohortId, quarterStart, quarterEnd });

    const [active, resolved, longRunningAlerts] = await Promise.all([
      // Active alerts computed within or before quarter end
      prisma.redFlagAlert.findMany({
        where: {
          cohortId,
          status: AlertStatus.ACTIVE,
          computedAt: { lte: quarterEnd },
        },
        select: { id: true, severity: true, type: true, firstSeenAt: true },
      }),
      // Resolved this quarter
      prisma.redFlagAlert.count({
        where: {
          cohortId,
          status: AlertStatus.RESOLVED,
          resolvedAt: { gte: quarterStart, lte: quarterEnd },
        },
      }),
      // All active — for long-running detection (oldest first)
      prisma.redFlagAlert.findMany({
        where: {
          cohortId,
          status: AlertStatus.ACTIVE,
        },
        select: { type: true, firstSeenAt: true },
        orderBy: { firstSeenAt: 'asc' },
        take: 10,
      }),
    ]);

    const bySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const alert of active) {
      if (alert.severity === RedFlagSeverity.CRITICAL) bySeverity.CRITICAL++;
      else if (alert.severity === RedFlagSeverity.HIGH) bySeverity.HIGH++;
      else if (alert.severity === RedFlagSeverity.MEDIUM) bySeverity.MEDIUM++;
      else if (alert.severity === RedFlagSeverity.LOW) bySeverity.LOW++;
    }

    const now = quarterEnd;
    const longRunning = longRunningAlerts
      .filter((a) => {
        const days = Math.floor(
          (now.getTime() - a.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return days > 14;
      })
      .slice(0, 5)
      .map((a) => ({
        type: a.type,
        days: Math.floor(
          (now.getTime() - a.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

    const data: RedFlagSnapshotData = {
      activeCount: active.length,
      resolvedThisQuarter: resolved,
      bySeverity,
      longRunning,
    };

    log.info('Red flag snapshot generated', { cohortId, activeCount: active.length });
    return { data };
  } catch (err) {
    log.error('Red flag snapshot failed', { error: err, cohortId });
    return { data: null, missing: ['redFlags'] };
  }
}
