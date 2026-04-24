/**
 * src/lib/dashboard/payload-builders/blm.ts
 * Dashboard payload builder for BLM (Badan Legislatif Mahasiswa) role.
 *
 * Gathers: anon report triage queue, anon by severity, compliance data.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { buildComplianceData } from './compliance';
import type { BLMDashboardPayload } from '@/types/dashboard';

const log = createLogger('m13/payload-builder/blm');

export async function buildBLMDashboard(
  userId: string,
  cohortId: string,
  organizationId: string,
): Promise<BLMDashboardPayload> {
  const start = Date.now();

  const [anonNew, anonBySeverity, compliance] = await Promise.all([
    // Total anon reports needing review (NEW or IN_REVIEW)
    prisma.anonReport.count({
      where: {
        cohortId,
        status: { in: ['NEW', 'IN_REVIEW'] },
      },
    }),

    // Count by severity
    Promise.all([
      prisma.anonReport.count({ where: { cohortId, severity: 'RED' } }),
      prisma.anonReport.count({ where: { cohortId, severity: 'YELLOW' } }),
      prisma.anonReport.count({ where: { cohortId, severity: 'GREEN' } }),
    ]).then(([red, yellow, green]) => ({
      // Map to compliance widget expected shape
      critical: red,
      high: yellow,
      medium: green,
      low: 0,
    })),

    buildComplianceData(cohortId, organizationId),
  ]);

  log.debug('BLM payload built', {
    userId,
    cohortId,
    anonNew,
    durationMs: Date.now() - start,
  });

  return {
    userId,
    cohortId,
    anonReportQueue: anonNew,
    anonBySeverity,
    compliance,
  };
}
