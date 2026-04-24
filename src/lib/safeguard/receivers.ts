/**
 * src/lib/safeguard/receivers.ts
 * NAWASENA M10 — Resolve notification receivers for escalation.
 *
 * Returns the set of users who should be notified when an incident occurs.
 * - SC (Steering Committee) users in the organization
 * - Safeguard Officers in the organization
 * - Pembina users in the organization
 * Always excludes the reporter to prevent self-notification.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import type { UserRole } from '@prisma/client';

const log = createLogger('safeguard:receivers');

export interface ReceiverUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isSafeguardOfficer: boolean;
}

/**
 * Resolve the list of users who should receive escalation notifications for an incident.
 *
 * @param orgId - Organization ID (for multi-tenant isolation)
 * @param reportedById - ID of the reporter — will be excluded from receivers
 * @returns Array of users who should be notified
 */
export async function resolveReceivers(
  orgId: string,
  reportedById: string,
): Promise<ReceiverUser[]> {
  log.info('Resolving incident receivers', { orgId, reportedById });

  const users = await prisma.user.findMany({
    where: {
      organizationId: orgId,
      status: 'ACTIVE',
      id: { not: reportedById },
      OR: [
        { role: 'SC' },
        { role: 'PEMBINA' },
        { isSafeguardOfficer: true },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isSafeguardOfficer: true,
    },
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
  });

  log.info('Receivers resolved', {
    orgId,
    count: users.length,
    breakdown: {
      sc: users.filter((u) => u.role === 'SC').length,
      safeguardOfficers: users.filter((u) => u.isSafeguardOfficer).length,
      pembina: users.filter((u) => u.role === 'PEMBINA').length,
    },
  });

  return users;
}
