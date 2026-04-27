/**
 * src/services/pakta.service.ts
 * PaktaService — dual-scope active pakta lookup, re-sign fan-out, hash chain.
 * Phase RV-B — M01 Revisi Multi-HMJ
 *
 * Naming reconciliation (see 13-arsitektur §0):
 *   "DIGITAL"  → enum SOCIAL_CONTRACT_MABA  (organizationId IS NULL — institusi-wide)
 *   "ETIK"     → enum PAKTA_PANITIA          (organizationId = orgId — per-HMJ)
 *   "ETIK v2"  → enum PAKTA_PENGADER_2027   (organizationId = orgId — per-HMJ varian)
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { withCache, invalidateCache, CACHE_TTL } from '@/lib/cache';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import type { PaktaVersion, PaktaType, UserPaktaStatus, UserRole } from '@prisma/client';

const log = createLogger('pakta-service');

// Per-type per-org cache keys (fine-grained invalidation)
const paktaCacheKey = {
  digital: () => 'pakta:active:digital',
  etik: (orgId: string) => `pakta:active:etik:${orgId}`,
  pengader: (orgId: string) => `pakta:active:pengader:${orgId}`,
  user: (userId: string) => `pakta:active:user:${userId}`,
};

// ---- Types ----

export interface ActivePaktaResult {
  /** SOCIAL_CONTRACT_MABA — institusi-wide (organizationId IS NULL) */
  digital: PaktaVersion | null;
  /** PAKTA_PANITIA — per-HMJ (organizationId = user's orgId) */
  etik: PaktaVersion | null;
  /** PAKTA_PENGADER_2027 — per-HMJ varian (organizationId = user's orgId) */
  socialContract: PaktaVersion | null;
}

export interface PaktaUserContext {
  id: string;
  organizationId: string;
  role: string;
}

// ---- Queries ----

/**
 * Fetch the active (PUBLISHED) pakta of a specific type for a given scope.
 * SOCIAL_CONTRACT_MABA: scope = null (global)
 * PAKTA_PANITIA / PAKTA_PENGADER_2027: scope = orgId
 */
async function fetchActivePaktaByTypeAndScope(
  type: PaktaType,
  orgId: string | null,
): Promise<PaktaVersion | null> {
  return prisma.paktaVersion.findFirst({
    where: {
      type,
      status: 'PUBLISHED',
      organizationId: orgId,
    },
    orderBy: { versionNumber: 'desc' },
  });
}

/**
 * Get all active published pakta versions for a user.
 * Uses Redis cache per scope (global DIGITAL + per-org ETIK/SOCIAL_CONTRACT).
 *
 * Returns:
 *   - digital: SOCIAL_CONTRACT_MABA with organizationId IS NULL
 *   - etik: PAKTA_PANITIA with organizationId = user's org
 *   - socialContract: PAKTA_PENGADER_2027 with organizationId = user's org
 */
export async function getActivePaktaForUser(
  user: PaktaUserContext,
): Promise<ActivePaktaResult> {
  const orgId = user.organizationId;

  const [digital, etik, socialContract] = await Promise.all([
    withCache<PaktaVersion | null>(
      paktaCacheKey.digital(),
      CACHE_TTL.HOUR,
      () => fetchActivePaktaByTypeAndScope('SOCIAL_CONTRACT_MABA', null),
    ),
    withCache<PaktaVersion | null>(
      paktaCacheKey.etik(orgId),
      CACHE_TTL.HOUR,
      () => fetchActivePaktaByTypeAndScope('PAKTA_PANITIA', orgId),
    ),
    withCache<PaktaVersion | null>(
      paktaCacheKey.pengader(orgId),
      CACHE_TTL.HOUR,
      () => fetchActivePaktaByTypeAndScope('PAKTA_PENGADER_2027', orgId),
    ),
  ]);

  log.debug('Active pakta resolved for user', {
    userId: user.id,
    orgId,
    hasDigital: !!digital,
    hasEtik: !!etik,
    hasSocialContract: !!socialContract,
  });

  return { digital, etik, socialContract };
}

/**
 * Get active pakta by a specific type for a user.
 * Convenience function used by /api/pakta/current refactor.
 */
export async function getActivePaktaByTypeForUser(
  user: PaktaUserContext,
  type: PaktaType,
): Promise<PaktaVersion | null> {
  // DIGITAL is always global (NULL org)
  const orgId = type === 'SOCIAL_CONTRACT_MABA' ? null : user.organizationId;

  const cacheKey =
    type === 'SOCIAL_CONTRACT_MABA'
      ? paktaCacheKey.digital()
      : type === 'PAKTA_PANITIA'
        ? paktaCacheKey.etik(user.organizationId)
        : paktaCacheKey.pengader(user.organizationId);

  return withCache<PaktaVersion | null>(
    cacheKey,
    CACHE_TTL.HOUR,
    () => fetchActivePaktaByTypeAndScope(type, orgId),
  );
}

/**
 * needsResign: check if the user's active signature is outdated.
 * Returns true if there is a newer published version that the user has not signed.
 */
export async function needsResign(
  userId: string,
  orgId: string,
  type: PaktaType,
): Promise<boolean> {
  const userCtx: PaktaUserContext = { id: userId, organizationId: orgId, role: '' };
  const active = await getActivePaktaByTypeForUser(userCtx, type);
  if (!active) return false;

  const signed = await prisma.paktaSignature.findFirst({
    where: { userId, type, status: 'ACTIVE' },
    orderBy: { signedAt: 'desc' },
    select: { paktaVersionId: true },
  });

  if (!signed) return true; // never signed at all
  return signed.paktaVersionId !== active.id;
}

// ---- Fan-out re-sign trigger ----

/**
 * Fan-out re-sign to all affected users after a new PaktaVersion is published.
 *
 * DIGITAL (SOCIAL_CONTRACT_MABA): fan-out to ALL active MABA across all orgs
 * ETIK / SOCIAL_CONTRACT (PAKTA_PANITIA, PAKTA_PENGADER_2027): fan-out to panitia in that org only
 *
 * Updates User.[fieldKey] = PENDING_RESIGN for all affected users.
 * Creates one audit log entry per batch (not per user — perf concern).
 */
export async function triggerResign(
  versionId: string,
  actorUserId: string,
): Promise<{ affectedCount: number }> {
  const version = await prisma.paktaVersion.findUnique({
    where: { id: versionId },
    select: { id: true, type: true, organizationId: true, versionNumber: true },
  });

  if (!version) throw new Error('PAKTA_VERSION_NOT_FOUND');

  const isDigital = version.type === 'SOCIAL_CONTRACT_MABA';

  // Determine affected users
  const userFilter = isDigital
    ? {
        status: 'ACTIVE' as const,
        role: 'MABA' as const,
      }
    : {
        organizationId: version.organizationId!,
        role: {
          in: ['SC', 'OC', 'KP', 'KASUH', 'ELDER'] as UserRole[],
        },
        status: 'ACTIVE' as const,
      };

  // Map PaktaType to user status field
  const userFieldMap: Record<PaktaType, string> = {
    SOCIAL_CONTRACT_MABA: 'socialContractStatus',
    PAKTA_PANITIA: 'paktaPanitiaStatus',
    PAKTA_PENGADER_2027: 'paktaPengader2027Status',
  };

  const userField = userFieldMap[version.type];

  log.info('Triggering re-sign fan-out', {
    versionId,
    type: version.type,
    orgId: version.organizationId,
    isDigital,
  });

  // Batch update affected users
  const result = await prisma.user.updateMany({
    where: userFilter,
    data: { [userField]: 'PENDING_RESIGN' as UserPaktaStatus },
  });

  // Audit: one entry for the fan-out batch
  await logAudit({
    action: AuditAction.PAKTA_RESIGN_TRIGGER,
    organizationId: version.organizationId ?? undefined,
    actorUserId,
    entityType: 'PaktaVersion',
    entityId: versionId,
    metadata: {
      type: version.type,
      versionNumber: version.versionNumber,
      affectedCount: result.count,
      scope: isDigital ? 'GLOBAL_DIGITAL' : `ORG_${version.organizationId}`,
    },
  });

  // Invalidate cache for affected scope
  if (isDigital) {
    await invalidateCache(paktaCacheKey.digital());
  } else if (version.organizationId) {
    await invalidateCache(paktaCacheKey.etik(version.organizationId));
    await invalidateCache(paktaCacheKey.pengader(version.organizationId));
  }

  log.info('Re-sign fan-out complete', {
    versionId,
    type: version.type,
    affectedCount: result.count,
  });

  return { affectedCount: result.count };
}

/**
 * Invalidate all pakta cache for a user (call after org transfer).
 */
export async function invalidatePaktaCacheForUser(userId: string): Promise<void> {
  await invalidateCache(paktaCacheKey.user(userId));
}

/**
 * Build hash chain payload for a PaktaSignature.
 * organizationId is explicitly included so signatures from different orgs
 * have cryptographically distinct payloads.
 *
 * Reference: 13-arsitektur §5.3
 */
export function buildHashPayload(params: {
  prevHash: string | null;
  versionId: string;
  versionNumber: number;
  type: PaktaType;
  organizationId: string | null;
  userId: string;
  signedAt: Date;
  quizScore: number;
}): Record<string, unknown> {
  return {
    prevHash: params.prevHash ?? 'GENESIS',
    versionId: params.versionId,
    versionNumber: params.versionNumber,
    type: params.type,
    organizationId: params.organizationId ?? 'NULL',
    userId: params.userId,
    signedAt: params.signedAt.toISOString(),
    quizScore: params.quizScore,
  };
}
