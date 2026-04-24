/**
 * src/lib/redflag-rules/kp-debrief-overdue.ts
 * Rule: KP_DEBRIEF_OVERDUE_14D — KP-Group debrief not logged for 14 days.
 */

import { RedFlagSeverity, RedFlagType, UserRole } from '@prisma/client';
import type { RedFlagRule, RuleContext, RuleHit } from './types';

export const kpDebriefOverdueRule: RedFlagRule = {
  type: RedFlagType.KP_DEBRIEF_OVERDUE_14D,
  name: 'KP Debrief Terlambat 14 Hari',
  defaultSeverity: RedFlagSeverity.MEDIUM,
  enabled: true,
  targetRoles: [UserRole.SC, UserRole.KP],

  async evaluate(ctx: RuleContext): Promise<RuleHit[]> {
    const { cohortId, organizationId, prisma, log } = ctx;
    const hits: RuleHit[] = [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);

    // Get all KP groups in this cohort
    const kpGroups = await prisma.kPGroup.findMany({
      where: { cohortId, status: 'ACTIVE' },
      select: { id: true, name: true, kpCoordinatorUserId: true },
    });

    // Get groups with recent weekly debrief logs
    const recentDebriefs = await prisma.kPLogWeekly.groupBy({
      by: ['kpGroupId'],
      where: { cohortId, submittedAt: { gte: cutoff } },
    });

    const activeDebriefGroups = new Set(recentDebriefs.map((d) => d.kpGroupId));

    for (const group of kpGroups) {
      if (!activeDebriefGroups.has(group.id)) {
        hits.push({
          targetUserId: group.kpCoordinatorUserId,
          targetResourceId: group.id,
          title: `Debrief KP-Group ${group.name} Terlambat`,
          description: 'KP-Group belum melakukan debrief mingguan dalam 14 hari terakhir',
          severity: RedFlagSeverity.MEDIUM,
          targetRoles: [UserRole.SC, UserRole.KP],
          targetUrl: `/dashboard/kp/group/${group.id}/log`,
          metadata: { kpGroupId: group.id, kpGroupName: group.name, overdueDays: 14 },
        });
      }
    }

    log.debug('kp-debrief-overdue evaluated', { cohortId, hits: hits.length });
    return hits;
  },
};
