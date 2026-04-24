/**
 * src/lib/redflag-rules/pakta-unsigned-7d.ts
 * Rule: PAKTA_UNSIGNED_7D — panitia role hasn't signed Pakta 7+ days after registration.
 */

import { RedFlagSeverity, RedFlagType, UserRole } from '@prisma/client';
import type { RedFlagRule, RuleContext, RuleHit } from './types';

const PANITIA_ROLES: UserRole[] = [
  UserRole.KP,
  UserRole.KASUH,
  UserRole.OC,
  UserRole.SC,
  UserRole.BLM,
  UserRole.SATGAS,
];

export const paktaUnsigned7DRule: RedFlagRule = {
  type: RedFlagType.PAKTA_UNSIGNED_7D,
  name: 'Pakta Panitia Belum Ditandatangani 7 Hari',
  defaultSeverity: RedFlagSeverity.HIGH,
  enabled: true,
  targetRoles: [UserRole.SC],

  async evaluate(ctx: RuleContext): Promise<RuleHit[]> {
    const { cohortId, organizationId, prisma, log } = ctx;
    const hits: RuleHit[] = [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    // Find panitia users who registered > 7 days ago but haven't signed Pakta Panitia
    const unsignedPanitia = await prisma.user.findMany({
      where: {
        currentCohortId: cohortId,
        organizationId,
        role: { in: PANITIA_ROLES },
        status: 'PENDING_PAKTA',
        createdAt: { lte: cutoff }, // registered more than 7 days ago
      },
      select: { id: true, displayName: true, fullName: true, createdAt: true },
    });

    for (const user of unsignedPanitia) {
      const daysSinceRegistration = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      hits.push({
        targetUserId: user.id,
        title: 'Pakta Panitia Belum Ditandatangani',
        description: `${user.displayName ?? user.fullName} belum menandatangani Pakta Panitia setelah ${daysSinceRegistration} hari`,
        severity: RedFlagSeverity.HIGH,
        targetRoles: [UserRole.SC],
        targetUrl: `/admin/users/${user.id}`,
        metadata: { daysSinceRegistration, userId: user.id },
      });
    }

    log.debug('pakta-unsigned-7d evaluated', { cohortId, hits: hits.length });
    return hits;
  },
};
