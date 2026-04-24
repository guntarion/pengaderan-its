/**
 * src/lib/anon-report/receivers.ts
 * NAWASENA M12 — Receiver resolution for escalation notifications.
 *
 * Queries users who should receive M12 notifications:
 *   - Satgas PPKPT for ITS-wide escalations
 *   - BLM officers for a specific cohort
 *
 * PRIVACY NOTE: These functions return user IDs for M15 sendNotification calls.
 * They never log email addresses or personal data.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import type { ReceiverUser } from './types';

const log = createLogger('anon-receivers');

/**
 * Resolve all Satgas PPKPT officers for ITS.
 * Includes users with role='SATGAS' OR isSafeguardOfficer=true.
 */
export async function resolveSatgasPPKPTForITS(): Promise<ReceiverUser[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'SATGAS' },
        { isSafeguardOfficer: true },
      ],
      status: 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  log.info('Resolved Satgas receivers', { count: users.length });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
  }));
}

/**
 * Resolve BLM officers for a specific cohort's organization.
 *
 * @param cohortId - The cohort id to resolve BLM officers for
 */
export async function resolveBLMForCohort(cohortId: string): Promise<ReceiverUser[]> {
  // Get the organization for this cohort first
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: { organizationId: true, name: true, code: true },
  });

  if (!cohort) {
    log.warn('Cohort not found when resolving BLM receivers', { cohortId });
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      organizationId: cohort.organizationId,
      role: 'BLM',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  log.info('Resolved BLM receivers for cohort', {
    cohortId,
    organizationId: cohort.organizationId,
    count: users.length,
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
  }));
}
