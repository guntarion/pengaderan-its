/**
 * src/lib/dashboard/payload-builders/satgas.ts
 * Dashboard payload builder for SATGAS role.
 *
 * Gathers: severe incidents, anon report count (count only, no body), program stats.
 * Privacy: shows count only for anon reports, no individual body text.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import type { SatgasDashboardPayload } from '@/types/dashboard';

const log = createLogger('m13/payload-builder/satgas');

export async function buildSatgasDashboard(
  userId: string,
  cohortId: string,
  organizationId: string,
): Promise<SatgasDashboardPayload> {
  const start = Date.now();

  const [severeIncidents, anonStats, programStats] = await Promise.all([
    // Red-severity incidents (OPEN + PENDING_REVIEW) — most severe in this schema
    prisma.safeguardIncident.count({
      where: {
        cohortId,
        severity: 'RED',
        status: { in: ['PENDING_REVIEW', 'OPEN', 'IN_REVIEW'] },
      },
    }),

    // Anon report counts (no body access per privacy rule)
    // Cell floor: show 0 for groups < 5 to protect privacy
    Promise.all([
      prisma.anonReport.count({ where: { cohortId } }),
      prisma.anonReport.count({ where: { cohortId, severity: 'RED' } }),
      prisma.anonReport.count({ where: { cohortId, severity: 'YELLOW' } }),
    ]).then(([total, redCount, yellowCount]) => ({
      total,
      critical: redCount >= 5 ? redCount : 0,  // cell floor k≥5
      high: yellowCount >= 5 ? yellowCount : 0,
    })),

    // Program stats: total maba, active maba, completed kegiatan
    Promise.all([
      prisma.user.count({
        where: { currentCohortId: cohortId, role: 'MABA' },
      }),
      prisma.user.count({
        where: { currentCohortId: cohortId, role: 'MABA', status: 'ACTIVE' },
      }),
      prisma.kegiatanInstance.count({
        where: { cohortId, status: 'DONE' },
      }),
    ]).then(([totalMaba, activeMaba, completedKegiatanCount]) => ({
      totalMaba,
      activeMaba,
      completedKegiatanCount,
    })),
  ]);

  log.debug('Satgas payload built', {
    userId,
    cohortId,
    organizationId,
    severeIncidents,
    durationMs: Date.now() - start,
  });

  return {
    userId,
    cohortId,
    severeIncidents,
    anonReportCount: anonStats.total,
    anonReportBySeverity: {
      critical: anonStats.critical,
      high: anonStats.high,
    },
    programStats,
  };
}
