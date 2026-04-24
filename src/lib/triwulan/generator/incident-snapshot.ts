/**
 * src/lib/triwulan/generator/incident-snapshot.ts
 * NAWASENA M14 — Safeguard Incident Snapshot sub-generator.
 *
 * Queries SafeguardIncident from M10, count by severity + TTR calculation.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';

const log = createLogger('m14/generator/incident-snapshot');

export interface IncidentSnapshotData {
  total: number;
  bySeverity: {
    RED: number;
    YELLOW: number;
    GREEN: number;
  };
  unresolvedCount: number;
  unresolvedRedCount: number;
  avgTTRDays: number | null;
}

export interface IncidentSnapshotResult {
  data: IncidentSnapshotData | null;
  missing?: string[];
}

export async function generateIncidentSnapshot(
  cohortId: string,
  quarterStart: Date,
  quarterEnd: Date
): Promise<IncidentSnapshotResult> {
  try {
    log.info('Generating incident snapshot', { cohortId, quarterStart, quarterEnd });

    const incidents = await prisma.safeguardIncident.findMany({
      where: {
        cohortId,
        occurredAt: { gte: quarterStart, lte: quarterEnd },
      },
      select: {
        id: true,
        severity: true,
        status: true,
        occurredAt: true,
        resolvedAt: true,
      },
    });

    const bySeverity = { RED: 0, YELLOW: 0, GREEN: 0 };
    let unresolvedCount = 0;
    let unresolvedRedCount = 0;
    const ttrDays: number[] = [];

    for (const incident of incidents) {
      // Count by severity
      if (incident.severity === IncidentSeverity.RED) bySeverity.RED++;
      else if (incident.severity === IncidentSeverity.YELLOW) bySeverity.YELLOW++;
      else if (incident.severity === IncidentSeverity.GREEN) bySeverity.GREEN++;
      const sev = incident.severity;

      // Check resolved
      if (incident.status !== IncidentStatus.RESOLVED) {
        unresolvedCount++;
        if (sev === 'RED') {
          unresolvedRedCount++;
        }
      }

      // Calculate TTR for resolved incidents
      if (incident.resolvedAt) {
        const days = (incident.resolvedAt.getTime() - incident.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
        ttrDays.push(days);
      }
    }

    const avgTTRDays =
      ttrDays.length > 0
        ? Math.round((ttrDays.reduce((a, b) => a + b, 0) / ttrDays.length) * 10) / 10
        : null;

    const data: IncidentSnapshotData = {
      total: incidents.length,
      bySeverity,
      unresolvedCount,
      unresolvedRedCount,
      avgTTRDays,
    };

    log.info('Incident snapshot generated', { cohortId, total: incidents.length });
    return { data };
  } catch (err) {
    log.error('Incident snapshot failed', { error: err, cohortId });
    return { data: null, missing: ['incidents'] };
  }
}
