/**
 * src/lib/redflag-rules/incident-unassigned.ts
 * Rule: INCIDENT_CREATED_UNASSIGNED — M10 incident NEW/unassigned for > 24 hours.
 */

import { RedFlagSeverity, RedFlagType, UserRole } from '@prisma/client';
import type { RedFlagRule, RuleContext, RuleHit } from './types';

export const incidentUnassignedRule: RedFlagRule = {
  type: RedFlagType.INCIDENT_CREATED_UNASSIGNED,
  name: 'Insiden Belum Ditangani 24 Jam',
  defaultSeverity: RedFlagSeverity.CRITICAL,
  enabled: true,
  targetRoles: [UserRole.SATGAS, UserRole.SC, UserRole.BLM],

  async evaluate(ctx: RuleContext): Promise<RuleHit[]> {
    const { cohortId, prisma, log } = ctx;
    const hits: RuleHit[] = [];

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    // PENDING_REVIEW = just created, not yet assigned; OPEN = acknowledged but unresolved
    const unassignedIncidents = await prisma.safeguardIncident.findMany({
      where: {
        cohortId,
        status: { in: ['PENDING_REVIEW', 'OPEN'] },
        createdAt: { lte: cutoff },
      },
      select: {
        id: true,
        type: true,
        severity: true,
        createdAt: true,
      },
    });

    for (const incident of unassignedIncidents) {
      const hoursUnassigned = Math.floor(
        (Date.now() - incident.createdAt.getTime()) / (1000 * 60 * 60),
      );

      hits.push({
        targetResourceId: incident.id,
        title: 'Insiden Belum Ditangani',
        description: `Insiden ${incident.type} (${incident.severity}) belum mendapat penanganan setelah ${hoursUnassigned} jam`,
        severity: RedFlagSeverity.CRITICAL,
        targetRoles: [UserRole.SATGAS, UserRole.SC, UserRole.BLM],
        targetUrl: `/dashboard/safeguard/incidents/${incident.id}`,
        metadata: { incidentId: incident.id, hoursUnassigned, incidentType: incident.type, incidentSeverity: incident.severity },
      });
    }

    log.debug('incident-unassigned evaluated', { cohortId, hits: hits.length });
    return hits;
  },
};
