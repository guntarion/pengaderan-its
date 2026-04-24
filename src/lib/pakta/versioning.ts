/**
 * src/lib/pakta/versioning.ts
 * Pakta versioning logic — triggers re-sign for all existing signers.
 *
 * Called from the SC admin publish flow within the same transaction.
 */

import { createLogger } from '@/lib/logger';
import type { PaktaType } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const log = createLogger('pakta-versioning');

// Map PaktaType → User field for status update
const PAKTA_TYPE_TO_USER_FIELD: Record<PaktaType, string> = {
  PAKTA_PANITIA: 'paktaPanitiaStatus',
  SOCIAL_CONTRACT_MABA: 'socialContractStatus',
  PAKTA_PENGADER_2027: 'paktaPengader2027Status',
};

type TransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Trigger re-sign for all users who signed the old version.
 *
 * Operations (in same transaction):
 * 1. Mark all active PaktaSignatures of old version → SUPERSEDED
 * 2. Update affected Users' pakta status → PENDING_RESIGN
 *
 * @param oldVersionId — the version being superseded
 * @param newVersionId — the newly published version
 * @param paktaType    — type of pakta (for filtering user field update)
 * @param tx           — Prisma transaction client
 * @returns count of users flagged for re-sign
 */
export async function triggerResignForAllSigners(
  oldVersionId: string,
  newVersionId: string,
  paktaType: PaktaType,
  tx: TransactionClient
): Promise<number> {
  const now = new Date();
  const userField = PAKTA_TYPE_TO_USER_FIELD[paktaType];

  // 1. Find all ACTIVE signatures for old version
  const activeSignatures = await tx.paktaSignature.findMany({
    where: {
      paktaVersionId: oldVersionId,
      status: 'ACTIVE',
    },
    select: { id: true, userId: true },
  });

  if (activeSignatures.length === 0) {
    log.info('No active signatures to supersede', { oldVersionId, newVersionId });
    return 0;
  }

  const signatureIds = activeSignatures.map((s) => s.id);
  const userIds = activeSignatures.map((s) => s.userId);

  // 2. Mark signatures as SUPERSEDED
  await tx.paktaSignature.updateMany({
    where: { id: { in: signatureIds } },
    data: {
      status: 'SUPERSEDED',
      supersededAt: now,
    },
  });

  // 3. Update User pakta status → PENDING_RESIGN
  await tx.user.updateMany({
    where: { id: { in: userIds } },
    data: {
      [userField]: 'PENDING_RESIGN',
    },
  });

  log.info('Re-sign triggered for signers', {
    oldVersionId,
    newVersionId,
    paktaType,
    affectedUsers: userIds.length,
  });

  return userIds.length;
}
