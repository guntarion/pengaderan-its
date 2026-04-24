/**
 * src/lib/redflag-rules/nps-drop.ts
 * Rule: NPS_DROP — event NPS score below threshold (< 0 or negative NPS).
 */

import { RedFlagSeverity, RedFlagType, UserRole } from '@prisma/client';
import type { RedFlagRule, RuleContext, RuleHit } from './types';

const NPS_THRESHOLD = 0; // NPS below 0 = detractor majority

export const npsDropRule: RedFlagRule = {
  type: RedFlagType.NPS_DROP,
  name: 'NPS Kegiatan Di Bawah Threshold',
  defaultSeverity: RedFlagSeverity.MEDIUM,
  enabled: true,
  targetRoles: [UserRole.SC, UserRole.OC],

  async evaluate(ctx: RuleContext): Promise<RuleHit[]> {
    const { cohortId, prisma, log } = ctx;
    const hits: RuleHit[] = [];

    const since = new Date();
    since.setDate(since.getDate() - 30);

    // Get recent events with NPS scores below threshold
    const lowNpsEvents = await prisma.kegiatanInstance.findMany({
      where: {
        cohortId,
        scheduledAt: { gte: since },
        npsEntries: {
          some: {},
        },
      },
      select: {
        id: true,
        kegiatanId: true,
        kegiatan: { select: { nama: true } },
        scheduledAt: true,
        npsEntries: {
          select: { npsScore: true },
        },
      },
    });

    for (const event of lowNpsEvents) {
      if (event.npsEntries.length === 0) continue;

      const avgNps =
        event.npsEntries.reduce((sum: number, e: { npsScore: number }) => sum + e.npsScore, 0) / event.npsEntries.length;

      if (avgNps < NPS_THRESHOLD) {
        hits.push({
          targetResourceId: event.id,
          title: `NPS Rendah: ${event.kegiatan.nama}`,
          description: `Rata-rata NPS ${avgNps.toFixed(1)} (dari ${event.npsEntries.length} responden) di bawah threshold ${NPS_THRESHOLD}`,
          severity: RedFlagSeverity.MEDIUM,
          targetRoles: [UserRole.SC, UserRole.OC],
          targetUrl: `/dashboard/oc/kegiatan/${event.id}/nps`,
          metadata: {
            avgNps: avgNps.toFixed(1),
            respondentCount: event.npsEntries.length,
            eventName: event.kegiatan.nama,
          },
        });
      }
    }

    log.debug('nps-drop evaluated', { cohortId, hits: hits.length });
    return hits;
  },
};
