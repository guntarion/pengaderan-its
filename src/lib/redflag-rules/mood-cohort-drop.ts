/**
 * src/lib/redflag-rules/mood-cohort-drop.ts
 * Rule: MOOD_COHORT_DROP — cohort average mood dropped > 20% vs 7-day prior baseline.
 */

import { RedFlagSeverity, RedFlagType, UserRole } from '@prisma/client';
import type { RedFlagRule, RuleContext, RuleHit } from './types';

export const moodCohortDropRule: RedFlagRule = {
  type: RedFlagType.MOOD_COHORT_DROP,
  name: 'Penurunan Mood Angkatan Signifikan',
  defaultSeverity: RedFlagSeverity.HIGH,
  enabled: true,
  targetRoles: [UserRole.SC, UserRole.KP],

  async evaluate(ctx: RuleContext): Promise<RuleHit[]> {
    const { cohortId, prisma, log } = ctx;
    const hits: RuleHit[] = [];

    const now = new Date();

    // Current 7-day window
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 7);

    // Prior 7-day baseline (7-14 days ago)
    const priorStart = new Date(now);
    priorStart.setDate(priorStart.getDate() - 14);
    const priorEnd = new Date(now);
    priorEnd.setDate(priorEnd.getDate() - 7);

    const [currentAvg, priorAvg] = await Promise.all([
      prisma.pulseCheck.aggregate({
        _avg: { mood: true },
        _count: { mood: true },
        where: { cohortId, recordedAt: { gte: currentStart } },
      }),
      prisma.pulseCheck.aggregate({
        _avg: { mood: true },
        _count: { mood: true },
        where: { cohortId, recordedAt: { gte: priorStart, lte: priorEnd } },
      }),
    ]);

    const current = currentAvg._avg.mood;
    const prior = priorAvg._avg.mood;
    const currentCount = (currentAvg._count as { mood?: number }).mood ?? 0;
    const priorCount = (priorAvg._count as { mood?: number }).mood ?? 0;

    if (current !== null && prior !== null && prior > 0) {
      const dropPercent = ((prior - current) / prior) * 100;

      if (dropPercent > 20) {
        hits.push({
          title: 'Penurunan Mood Angkatan Signifikan',
          description: `Rata-rata mood angkatan turun ${dropPercent.toFixed(1)}% dibanding baseline 7 hari lalu (${prior.toFixed(2)} → ${current.toFixed(2)})`,
          severity: RedFlagSeverity.HIGH,
          targetRoles: [UserRole.SC, UserRole.KP],
          targetUrl: `/dashboard/sc?tab=mood`,
          metadata: {
            currentAvg: current,
            priorAvg: prior,
            dropPercent: dropPercent.toFixed(1),
            currentCount,
            priorCount,
          },
        });
      }
    }

    log.debug('mood-cohort-drop evaluated', { cohortId, hits: hits.length });
    return hits;
  },
};
