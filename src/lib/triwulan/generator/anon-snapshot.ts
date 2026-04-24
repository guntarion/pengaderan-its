/**
 * src/lib/triwulan/generator/anon-snapshot.ts
 * NAWASENA M14 — Anonymous Report Snapshot sub-generator.
 *
 * PRIVACY CRITICAL: Count-only aggregation. NO body, NO tracking code, NO IP.
 * Respects anonymity invariant of M12.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { AnonCategory, AnonSeverity, AnonStatus } from '@prisma/client';

const log = createLogger('m14/generator/anon-snapshot');

export interface AnonSnapshotData {
  total: number;
  byCategory: {
    HARASSMENT: number;
    BULLYING: number;
    UNFAIR: number;
    SUGGESTION: number;
    OTHER: number;
  };
  redCount: number;
  avgTTRDays: number | null;
}

export interface AnonSnapshotResult {
  data: AnonSnapshotData | null;
  missing?: string[];
}

export async function generateAnonSnapshot(
  cohortId: string,
  quarterStart: Date,
  quarterEnd: Date
): Promise<AnonSnapshotResult> {
  try {
    log.info('Generating anon report snapshot (count-only)', { cohortId, quarterStart, quarterEnd });

    // PRIVACY: Only count by category + severity. No body, no tracking code.
    const reports = await prisma.anonReport.findMany({
      where: {
        cohortId,
        recordedAt: { gte: quarterStart, lte: quarterEnd },
      },
      select: {
        // NO: body, trackingCode, reporterFingerprint (PRIVACY)
        // Only: counts and metadata
        id: true,
        category: true,
        severity: true,
        status: true,
        recordedAt: true,
        closedAt: true,
      },
    });

    const byCategory = {
      HARASSMENT: 0,
      BULLYING: 0,
      UNFAIR: 0,
      SUGGESTION: 0,
      OTHER: 0,
    };

    let redCount = 0;
    const ttrDays: number[] = [];

    for (const report of reports) {
      // Count by category
      const cat = report.category as string;
      if (cat in byCategory) {
        byCategory[cat as keyof typeof byCategory]++;
      } else {
        byCategory.OTHER++;
      }

      // Count RED severity
      if (report.severity === AnonSeverity.RED) {
        redCount++;
      }

      // TTR calculation for resolved reports
      if (report.closedAt && report.status === AnonStatus.RESOLVED) {
        const days = (report.closedAt.getTime() - report.recordedAt.getTime()) / (1000 * 60 * 60 * 24);
        ttrDays.push(days);
      }
    }

    const avgTTRDays =
      ttrDays.length > 0
        ? Math.round((ttrDays.reduce((a, b) => a + b, 0) / ttrDays.length) * 10) / 10
        : null;

    const data: AnonSnapshotData = {
      total: reports.length,
      byCategory,
      redCount,
      avgTTRDays,
    };

    log.info('Anon snapshot generated (count-only)', {
      cohortId,
      total: reports.length,
      redCount,
    });
    return { data };
  } catch (err) {
    log.error('Anon snapshot failed', { error: err, cohortId });
    return { data: null, missing: ['anonReports'] };
  }
}
