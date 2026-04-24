/**
 * src/lib/dashboard/payload-builders/pembina.ts
 * Dashboard payload builder for PEMBINA role.
 *
 * Gathers: Kirkpatrick compact, compliance, CRITICAL alerts.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { computeKirkpatrickSnapshot } from '@/lib/dashboard/aggregation/kirkpatrick';
import { buildComplianceData } from './compliance';
import type { PembinaDashboardPayload, AlertItem } from '@/types/dashboard';

const log = createLogger('m13/payload-builder/pembina');

export async function buildPembinaDashboard(
  userId: string,
  cohortId: string,
  organizationId: string,
): Promise<PembinaDashboardPayload> {
  const start = Date.now();

  const [kirkpatrick, compliance, criticalAlerts] = await Promise.all([
    computeKirkpatrickSnapshot(cohortId, organizationId),

    buildComplianceData(cohortId, organizationId),

    // Only CRITICAL alerts for Pembina view
    prisma.redFlagAlert.findMany({
      where: {
        cohortId,
        status: 'ACTIVE',
        severity: 'CRITICAL',
      },
      orderBy: { firstSeenAt: 'asc' },
      take: 10,
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
  ]);

  const formattedAlerts: AlertItem[] = criticalAlerts.map((a) => ({
    id: a.id,
    type: a.type,
    severity: a.severity as AlertItem['severity'],
    status: a.status as AlertItem['status'],
    title: a.title,
    targetUrl: a.targetUrl,
    firstSeenAt: a.firstSeenAt.toISOString(),
    computedAt: a.computedAt.toISOString(),
  }));

  log.debug('Pembina payload built', {
    userId,
    cohortId,
    criticalAlerts: formattedAlerts.length,
    durationMs: Date.now() - start,
  });

  return {
    userId,
    cohortId,
    kirkpatrick,
    compliance,
    criticalAlerts: formattedAlerts,
  };
}
