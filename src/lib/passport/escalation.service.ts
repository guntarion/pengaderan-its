/**
 * src/lib/passport/escalation.service.ts
 * NAWASENA M05 — Auto-escalation cron for PENDING entries > 7 days.
 *
 * Logic:
 * 1. Query PassportEntry WHERE status=PENDING AND submittedAt < now-7days AND escalatedAt IS NULL
 * 2. For each: resolve escalation target based on verifier.role
 * 3. Update entry: escalatedAt + escalatedToUserId
 * 4. Send M15 notification
 * 5. Audit PASSPORT_ENTRY_ESCALATED
 * 6. Use Redis SETNX per entry for idempotency (TTL 5 min)
 */

import { prisma } from '@/utils/prisma';
import { PassportEntryStatus, AuditAction } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import { acquireEscalationLock } from './progress-cache';
import { sendNotification } from '@/lib/notifications/send';

const log = createLogger('passport:escalation');

const ESCALATION_THRESHOLD_DAYS = 7;
const MAX_PER_RUN = 100;

export interface EscalationResult {
  escalated: number;
  skipped: number;
  errors: string[];
}

/**
 * Resolve escalation target based on verifier's role.
 * - If verifier.role == KASUH → get KP coordinator from Maba's KPGroup
 * - If verifier.role == KP → get first SC of cohort
 * - If verifier.role == DOSEN_WALI → get first SC of cohort
 * - Default: first SC of cohort
 */
async function resolveEscalationTarget(entry: {
  userId: string;
  cohortId: string;
  organizationId: string;
  verifierId: string | null;
}): Promise<string | null> {
  if (!entry.verifierId) {
    // No verifier, escalate to first SC in cohort
    return getFirstScInCohort(entry.organizationId, entry.cohortId);
  }

  const verifier = await prisma.user.findUnique({
    where: { id: entry.verifierId },
    select: { role: true },
  });
  if (!verifier) return getFirstScInCohort(entry.organizationId, entry.cohortId);

  if (verifier.role === 'KASUH') {
    // Escalate to KP coordinator of Maba's KPGroup
    const membership = await prisma.kPGroupMember.findFirst({
      where: {
        userId: entry.userId,
        leftAt: null,
        kpGroup: { cohortId: entry.cohortId },
      },
      include: { kpGroup: { select: { kpCoordinatorUserId: true } } },
    });
    return membership?.kpGroup.kpCoordinatorUserId ?? getFirstScInCohort(entry.organizationId, entry.cohortId);
  }

  // For KP, DOSEN_WALI, or unknown → escalate to SC
  return getFirstScInCohort(entry.organizationId, entry.cohortId);
}

async function getFirstScInCohort(
  organizationId: string,
  cohortId: string,
): Promise<string | null> {
  const sc = await prisma.user.findFirst({
    where: { organizationId, role: 'SC', currentCohortId: cohortId },
    select: { id: true },
  });
  return sc?.id ?? null;
}

/**
 * Run the nightly escalation cron.
 */
export async function runEscalationCron(): Promise<EscalationResult> {
  log.info('Running escalation cron');

  const threshold = new Date(
    Date.now() - ESCALATION_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
  );

  const pendingEntries = await prisma.passportEntry.findMany({
    where: {
      status: PassportEntryStatus.PENDING,
      submittedAt: { lt: threshold },
      escalatedAt: null,
    },
    select: {
      id: true,
      userId: true,
      cohortId: true,
      organizationId: true,
      verifierId: true,
      itemId: true,
    },
    take: MAX_PER_RUN,
    orderBy: { submittedAt: 'asc' },
  });

  log.info(`Found ${pendingEntries.length} entries to escalate`);

  let escalated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const entry of pendingEntries) {
    try {
      // Acquire Redis lock per entry (5-minute TTL for idempotency)
      const lockAcquired = await acquireEscalationLock(entry.id);
      if (!lockAcquired) {
        log.debug('Escalation lock held, skipping', { entryId: entry.id });
        skipped++;
        continue;
      }

      // Resolve escalation target
      const targetUserId = await resolveEscalationTarget(entry);
      if (!targetUserId) {
        log.warn('No escalation target found', { entryId: entry.id });
        skipped++;
        continue;
      }

      // Update entry
      await prisma.passportEntry.update({
        where: { id: entry.id },
        data: {
          escalatedAt: new Date(),
          escalatedToUserId: targetUserId,
        },
      });

      // Notify target
      await sendNotification({
        userId: targetUserId,
        templateKey: 'PASSPORT_ESCALATION',
        category: 'NORMAL',
        payload: {
          entryId: entry.id,
          itemId: entry.itemId,
          originalVerifierId: entry.verifierId ?? 'unassigned',
          daysPending: ESCALATION_THRESHOLD_DAYS,
        },
      });

      // Audit log
      await prisma.nawasenaAuditLog.create({
        data: {
          organizationId: entry.organizationId,
          action: AuditAction.PASSPORT_ENTRY_ESCALATED,
          actorUserId: null, // system action
          subjectUserId: entry.userId,
          entityType: 'PassportEntry',
          entityId: entry.id,
          afterValue: { escalatedToUserId: targetUserId, daysPending: ESCALATION_THRESHOLD_DAYS },
          metadata: { cronRun: true },
        },
      });

      escalated++;
      log.debug('Entry escalated', { entryId: entry.id, targetUserId });
    } catch (err) {
      const msg = `Failed to escalate entry ${entry.id}: ${(err as Error).message}`;
      log.error(msg, { error: err });
      errors.push(msg);
    }
  }

  log.info('Escalation cron complete', { escalated, skipped, errors: errors.length });
  return { escalated, skipped, errors };
}
