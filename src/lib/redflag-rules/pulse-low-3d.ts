/**
 * src/lib/redflag-rules/pulse-low-3d.ts
 * Rule: PULSE_LOW_3D — user with pulse score ≤ 2 for 3+ consecutive days.
 */

import { RedFlagSeverity, RedFlagType, UserRole } from '@prisma/client';
import type { RedFlagRule, RuleContext, RuleHit } from './types';

export const pulseLow3DRule: RedFlagRule = {
  type: RedFlagType.PULSE_LOW_3D,
  name: 'Pulse Rendah 3 Hari',
  defaultSeverity: RedFlagSeverity.HIGH,
  enabled: true,
  targetRoles: [UserRole.KP, UserRole.KASUH, UserRole.SC],

  async evaluate(ctx: RuleContext): Promise<RuleHit[]> {
    const { cohortId, prisma, log } = ctx;
    const hits: RuleHit[] = [];

    // Get pulse entries for last 5 days (buffer for consecutive check)
    const since = new Date();
    since.setDate(since.getDate() - 5);

    const entries = await prisma.pulseCheck.findMany({
      where: {
        cohortId,
        recordedAt: { gte: since },
        mood: { lte: 2 },
      },
      select: { userId: true, recordedAt: true, mood: true },
      orderBy: { recordedAt: 'desc' },
    });

    // Group by userId
    const byUser: Record<string, Date[]> = {};
    for (const entry of entries) {
      if (!byUser[entry.userId]) byUser[entry.userId] = [];
      const day = new Date(entry.recordedAt);
      day.setHours(0, 0, 0, 0);
      if (!byUser[entry.userId].some((d) => d.getTime() === day.getTime())) {
        byUser[entry.userId].push(day);
      }
    }

    for (const [userId, days] of Object.entries(byUser)) {
      if (days.length >= 3) {
        hits.push({
          targetUserId: userId,
          title: 'Pulse Rendah 3 Hari Berturut-turut',
          description: `Maba melaporkan mood ≤2 selama ${days.length} hari`,
          severity: RedFlagSeverity.HIGH,
          targetRoles: [UserRole.KP, UserRole.KASUH, UserRole.SC],
          targetUrl: `/dashboard/pulse/user/${userId}?view=history`,
          metadata: { consecutiveDays: days.length, lowScoreDays: days.map((d) => d.toISOString()) },
        });
      }
    }

    log.debug('pulse-low-3d evaluated', { cohortId, hits: hits.length });
    return hits;
  },
};
