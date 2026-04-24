/**
 * src/lib/m09-access/peer-cohort-resolver.ts
 * NAWASENA M09 — KP peer debrief scope resolver.
 *
 * Enforces cohort-level scope: KP can only read debriefs from peers
 * in the same cohort. Cross-cohort access returns ForbiddenError.
 *
 * All reads are audited via PEER_DEBRIEF_READ.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { ForbiddenError, NotFoundError } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import type { KPLogWeekly } from '@prisma/client';

const log = createLogger('m09:peer-cohort-resolver');

/**
 * Get the cohort ID for a KP user.
 */
async function getKPCohortId(kpUserId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: kpUserId },
    select: { currentCohortId: true },
  });
  return user?.currentCohortId ?? null;
}

/**
 * Get all peer KP user IDs in the same cohort as the requesting KP.
 * Excludes the requesting KP themselves.
 */
export async function getPeerKPsInCohort(kpUserId: string): Promise<string[]> {
  log.debug('Getting peer KPs in cohort', { kpUserId });

  const cohortId = await getKPCohortId(kpUserId);
  if (!cohortId) {
    log.warn('KP has no active cohort', { kpUserId });
    return [];
  }

  // Find all KP groups in this cohort to get coordinator IDs
  const kpGroups = await prisma.kPGroup.findMany({
    where: {
      cohortId,
      status: { not: 'ARCHIVED' },
    },
    select: { kpCoordinatorUserId: true },
  });

  // Return all peer KP IDs (excluding the requesting user)
  return kpGroups
    .map((g) => g.kpCoordinatorUserId)
    .filter((id) => id !== kpUserId);
}

/**
 * Check if reader KP can read debrief written by debriefKP.
 * Both must be in the same cohort.
 */
export async function canReadPeerDebrief(
  readerKpId: string,
  debriefKpId: string,
): Promise<boolean> {
  const [readerCohort, debriefCohort] = await Promise.all([
    getKPCohortId(readerKpId),
    getKPCohortId(debriefKpId),
  ]);

  if (!readerCohort || !debriefCohort) {
    return false;
  }

  return readerCohort === debriefCohort;
}

/**
 * Get a peer's weekly debrief.
 * Throws ForbiddenError if reader is not in the same cohort.
 * Audits PEER_DEBRIEF_READ on every successful access.
 */
export async function getPeerDebrief(
  readerKpId: string,
  debriefKpId: string,
  weekNumber: number,
  yearNumber: number,
): Promise<KPLogWeekly> {
  log.debug('Getting peer debrief', { readerKpId, debriefKpId, weekNumber, yearNumber });

  // Scope check
  const canRead = await canReadPeerDebrief(readerKpId, debriefKpId);
  if (!canRead) {
    log.warn('Cross-cohort peer debrief access blocked', { readerKpId, debriefKpId });
    throw ForbiddenError('Tidak dapat mengakses debrief peer dari cohort lain');
  }

  const debrief = await prisma.kPLogWeekly.findUnique({
    where: {
      kpUserId_weekNumber_yearNumber: {
        kpUserId: debriefKpId,
        weekNumber,
        yearNumber,
      },
    },
  });

  if (!debrief) {
    throw NotFoundError('Debrief peer tidak ditemukan untuk minggu ini');
  }

  // Audit the access
  await auditLog.record({
    userId: readerKpId,
    action: 'PEER_DEBRIEF_READ',
    resource: 'KPLogWeekly',
    resourceId: debrief.id,
    metadata: {
      debriefKpId,
      weekNumber,
      yearNumber,
    },
  });

  return debrief;
}

/**
 * Get list of peers who have submitted debriefs for a given week.
 */
export async function getPeerDebriefList(
  readerKpId: string,
  weekNumber: number,
  yearNumber: number,
): Promise<Array<{ kpUserId: string; debriefId: string; submittedAt: Date }>> {
  const peerIds = await getPeerKPsInCohort(readerKpId);

  if (peerIds.length === 0) {
    return [];
  }

  const debriefs = await prisma.kPLogWeekly.findMany({
    where: {
      kpUserId: { in: peerIds },
      weekNumber,
      yearNumber,
    },
    select: {
      id: true,
      kpUserId: true,
      submittedAt: true,
      whatWorked: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  return debriefs.map((d) => ({
    kpUserId: d.kpUserId,
    debriefId: d.id,
    submittedAt: d.submittedAt,
    preview: d.whatWorked.substring(0, 100),
  }));
}
