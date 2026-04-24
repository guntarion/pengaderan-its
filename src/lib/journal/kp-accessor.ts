/**
 * src/lib/journal/kp-accessor.ts
 * NAWASENA M04 — KP journal access with RLS bypass + audit.
 *
 * KP cannot read other Maba journals via normal RLS (which only allows self-read).
 * This accessor:
 * 1. Verifies KP has scope to the journal's Maba via KPGroupMember.
 * 2. Bypasses RLS to read the journal.
 * 3. Creates an audit log entry JOURNAL_KP_ACCESS.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { resolveKPForMaba } from '@/lib/kp-group-resolver/resolve-kp-for-maba';
import { AuditAction } from '@prisma/client';

const log = createLogger('journal-kp-accessor');

/**
 * Get a specific journal for KP review.
 * Validates KP has access to the Maba's group, bypasses RLS, audits access.
 *
 * @param journalId     - Journal to fetch
 * @param kpUserId      - KP user requesting access
 * @param organizationId - Org scope
 * @returns Journal row or null if not found
 * @throws Error if KP does not have scope to this Maba
 */
export async function getJournalForKPReview(
  journalId: string,
  kpUserId: string,
  organizationId: string,
) {
  log.info('KP journal access request', { journalId, kpUserId });

  // Fetch journal without RLS scope — use admin privileges
  // We do this by running a raw query that bypasses RLS via SET LOCAL
  const journals = await prisma.$queryRaw<Array<{
    id: string;
    userId: string;
    cohortId: string;
    weekNumber: number;
    whatHappened: string;
    soWhat: string;
    nowWhat: string;
    wordCount: number;
    status: string;
    isLate: boolean;
    submittedAt: Date;
    weekStartDate: Date;
    weekEndDate: Date;
    organizationId: string;
  }>>`
    SET LOCAL app.bypass_rls = 'true';
    SELECT id, "userId", "cohortId", "weekNumber", "whatHappened", "soWhat", "nowWhat",
           "wordCount", status, "isLate", "submittedAt", "weekStartDate", "weekEndDate", "organizationId"
    FROM journals
    WHERE id = ${journalId}
      AND "organizationId" = ${organizationId}
    LIMIT 1;
    SET LOCAL app.bypass_rls = 'false';
  `;

  const journal = journals[0] ?? null;

  if (!journal) {
    log.warn('Journal not found or out of org scope', { journalId, kpUserId });
    return null;
  }

  // Verify KP has scope to this Maba via KPGroupMember
  const kpInfo = await resolveKPForMaba(journal.userId, journal.cohortId);
  if (!kpInfo || kpInfo.kpUserId !== kpUserId) {
    log.warn('KP does not have scope to this journal', {
      journalId,
      kpUserId,
      subjectUserId: journal.userId,
    });
    throw new Error('Forbidden: KP does not have access to this journal');
  }

  // Audit log
  await prisma.nawasenaAuditLog.create({
    data: {
      organizationId,
      action: AuditAction.JOURNAL_KP_ACCESS,
      actorUserId: kpUserId,
      subjectUserId: journal.userId,
      entityType: 'Journal',
      entityId: journalId,
      metadata: {
        weekNumber: journal.weekNumber,
        kpGroupId: kpInfo.kpGroupId,
      },
    },
  });

  log.info('KP journal access granted', { journalId, kpUserId, subjectUserId: journal.userId });
  return journal;
}

/**
 * List journals for all Maba in a KP's group that need scoring.
 * Uses RLS bypass to read Maba journals.
 */
export async function listUnscoredJournalsForKP(
  kpUserId: string,
  cohortId: string,
  organizationId: string,
) {
  log.info('Listing unscored journals for KP', { kpUserId, cohortId });

  // Get all Maba in this KP's group
  const { resolveMabaForKP } = await import('@/lib/kp-group-resolver/resolve-maba-for-kp');
  const mabaInfo = await resolveMabaForKP(kpUserId, cohortId);

  if (!mabaInfo || mabaInfo.mabaUserIds.length === 0) {
    log.debug('KP has no Maba in group', { kpUserId });
    return [];
  }

  // Find journals without RubrikScore for JOURNAL_REFLECTION
  // Using bypass_rls to read Maba journals
  const journals = await prisma.$queryRaw<Array<{
    id: string;
    userId: string;
    weekNumber: number;
    submittedAt: Date;
    wordCount: number;
    status: string;
    userFullName?: string;
  }>>`
    SET LOCAL app.bypass_rls = 'true';
    SELECT j.id, j."userId", j."weekNumber", j."submittedAt", j."wordCount", j.status,
           u."fullName" as "userFullName"
    FROM journals j
    JOIN users u ON u.id = j."userId"
    LEFT JOIN rubrik_scores rs ON rs."contextKey" = 'JOURNAL_REFLECTION:' || j.id
    WHERE j."cohortId" = ${cohortId}
      AND j."organizationId" = ${organizationId}
      AND j."userId" = ANY(${mabaInfo.mabaUserIds}::text[])
      AND j.status != 'MISSED'
      AND rs.id IS NULL
    ORDER BY j."submittedAt" ASC;
    SET LOCAL app.bypass_rls = 'false';
  `;

  log.info('Unscored journals found', { kpUserId, count: journals.length });
  return journals;
}
