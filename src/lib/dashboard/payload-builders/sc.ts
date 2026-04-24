/**
 * src/lib/dashboard/payload-builders/sc.ts
 * Dashboard payload builder for SC (Steering Committee) role.
 *
 * Gathers: Kirkpatrick full snapshot, mood cohort, alerts, compliance, anon count.
 * Privacy: cell floor ≥5 for all MH/anon data, no individual MH data, no anon body.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { computeKirkpatrickSnapshot } from '@/lib/dashboard/aggregation/kirkpatrick';
import {
  getTodayMoodAvg,
  getActiveAlertCount,
} from '@/lib/dashboard/aggregation/live-compute';
import { buildComplianceData } from './compliance';
import type { SCDashboardPayload, AlertItem } from '@/types/dashboard';

const log = createLogger('m13/payload-builder/sc');

export async function buildSCDashboard(
  userId: string,
  cohortId: string,
  organizationId: string,
): Promise<SCDashboardPayload> {
  const start = Date.now();

  const [kirkpatrick, moodCohort, alertCount, activeAlerts, compliance, anonCounts] = await Promise.all([
    computeKirkpatrickSnapshot(cohortId, organizationId),

    getTodayMoodAvg(cohortId),

    getActiveAlertCount(cohortId),

    // Active alerts for SC role
    prisma.redFlagAlert.findMany({
      where: {
        cohortId,
        status: 'ACTIVE',
        targetRoles: { has: 'SC' },
      },
      orderBy: [{ severity: 'desc' }, { firstSeenAt: 'asc' }],
      take: 15,
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        title: true,
        targetUrl: true,
        firstSeenAt: true,
        computedAt: true,
      },
    }),

    buildComplianceData(cohortId, organizationId),

    // Anon report counts only — no body, per privacy policy
    // Cell floor k≥5: show 0 for groups smaller than 5 (k-anonymity)
    Promise.all([
      prisma.anonReport.count({ where: { cohortId } }),
      prisma.anonReport.count({ where: { cohortId, severity: 'RED' } }),
      prisma.anonReport.count({ where: { cohortId, severity: 'YELLOW' } }),
      prisma.anonReport.count({ where: { cohortId, severity: 'GREEN' } }),
    ]).then(([total, red, yellow, green]) => ({
      total,
      critical: red >= 5 ? red : 0,
      high: yellow >= 5 ? yellow : 0,
      medium: green >= 5 ? green : 0,
      low: 0,
    })),
  ]);

  const formattedAlerts: AlertItem[] = activeAlerts.map((a) => ({
    id: a.id,
    type: a.type,
    severity: a.severity as AlertItem['severity'],
    status: a.status as AlertItem['status'],
    title: a.title,
    targetUrl: a.targetUrl,
    firstSeenAt: a.firstSeenAt.toISOString(),
    computedAt: a.computedAt.toISOString(),
  }));

  log.debug('SC payload built', {
    userId,
    cohortId,
    alertCount: formattedAlerts.length,
    durationMs: Date.now() - start,
  });

  return {
    userId,
    cohortId,
    kirkpatrick,
    moodCohort,
    alerts: formattedAlerts,
    alertCount,
    compliance,
    anonReportCount: anonCounts,
  };
}
