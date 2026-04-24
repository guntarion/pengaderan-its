/**
 * src/lib/redflag-rules/journal-dormant-14d.ts
 * Rule: JOURNAL_DORMANT_14D — user hasn't submitted a journal for 14 days.
 */

import { RedFlagSeverity, RedFlagType, UserRole } from '@prisma/client';
import type { RedFlagRule, RuleContext, RuleHit } from './types';

export const journalDormant14DRule: RedFlagRule = {
  type: RedFlagType.JOURNAL_DORMANT_14D,
  name: 'Journal Tidak Aktif 14 Hari',
  defaultSeverity: RedFlagSeverity.MEDIUM,
  enabled: true,
  targetRoles: [UserRole.KP, UserRole.KASUH, UserRole.SC],

  async evaluate(ctx: RuleContext): Promise<RuleHit[]> {
    const { cohortId, prisma, log } = ctx;
    const hits: RuleHit[] = [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);

    // Get all MABA users in this cohort
    const mabaUsers = await prisma.user.findMany({
      where: { currentCohortId: cohortId, role: 'MABA', status: 'ACTIVE' },
      select: { id: true },
    });

    // Get users who submitted a journal in the last 14 days
    const activeSubmitters = await prisma.journal.groupBy({
      by: ['userId'],
      where: { cohortId, createdAt: { gte: cutoff } },
    });

    const activeSet = new Set(activeSubmitters.map((s) => s.userId));

    for (const user of mabaUsers) {
      if (!activeSet.has(user.id)) {
        hits.push({
          targetUserId: user.id,
          title: 'Tidak Ada Journal 14 Hari',
          description: 'Maba tidak mengirimkan journal selama 14 hari terakhir',
          severity: RedFlagSeverity.MEDIUM,
          targetRoles: [UserRole.KP, UserRole.KASUH, UserRole.SC],
          targetUrl: `/dashboard/journal/user/${user.id}`,
          metadata: { dormantDays: 14 },
        });
      }
    }

    log.debug('journal-dormant-14d evaluated', { cohortId, hits: hits.length });
    return hits;
  },
};
