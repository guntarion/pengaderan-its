/**
 * POST /api/admin/struktur/buddy-pairs/generate/commit
 * Commit buddy pair generation from preview token.
 * Advisory lock + Serializable isolation.
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, BadRequestError } from '@/lib/api';
import { generateBuddyCommitSchema } from '@/lib/schemas/kp-group';
import { readPreview, invalidatePreview } from '@/lib/preview-cache';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import type { BuddyPairResult } from '@/lib/pairing/types';

const log = createLogger('buddy-pair-commit');

interface BuddyPreviewData {
  cohortId: string;
  organizationId: string;
  actorUserId: string;
  pairs: BuddyPairResult[];
  metadata: {
    algorithmVersion: string;
    seed: string;
    inputHash: string;
    crossRatio: number;
    pairCount: number;
    crossDemographicCount: number;
    unpaired: string[];
    tripleCount: number;
  };
}

export const POST = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const data = await validateBody(req, generateBuddyCommitSchema);
    const user = ctx.user as { id: string };

    const preview = await readPreview<BuddyPreviewData>(data.previewToken);
    if (!preview) {
      throw BadRequestError('Preview token tidak valid atau sudah kedaluwarsa');
    }

    if (preview.cohortId !== data.cohortId) {
      throw BadRequestError('Preview token tidak cocok dengan cohort');
    }

    ctx.log.info('Committing Buddy Pair generation', {
      cohortId: data.cohortId,
      pairCount: preview.pairs.length,
    });

    const lockKey = BigInt(
      preview.cohortId.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffffff, 0)
        + 1 // +1 to distinguish from KP Group lock
    );

    let createdPairCount = 0;

    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

        // Create BulkPairingBatch metadata
        const batch = await tx.bulkPairingBatch.create({
          data: {
            organizationId: preview.organizationId,
            cohortId: preview.cohortId,
            batchType: 'BUDDY_GENERATE',
            algorithmVersion: preview.metadata.algorithmVersion,
            seed: preview.metadata.seed,
            inputHash: preview.metadata.inputHash,
            summary: {
              pairCount: preview.pairs.length,
              crossDemographicRatio: preview.metadata.crossRatio,
              unpaired: preview.metadata.unpaired,
              tripleCount: preview.metadata.tripleCount,
            },
            committedBy: user.id,
            previewTokenHash: data.previewToken.slice(0, 8),
          },
        });

        // Create BuddyPair + BuddyPairMember records
        for (const pair of preview.pairs) {
          try {
            const buddyPair = await tx.buddyPair.create({
              data: {
                organizationId: preview.organizationId,
                cohortId: preview.cohortId,
                reasonForPairing: pair.reasonForPairing,
                isCrossDemographic: pair.isCrossDemographic,
                algorithmVersion: preview.metadata.algorithmVersion,
                algorithmSeed: preview.metadata.seed,
                generationBatchId: batch.id,
                isTriple: pair.isTriple,
                status: 'ACTIVE',
                createdBy: user.id,
              },
            });

            // Create members
            const memberIds = [pair.userAId, pair.userBId, ...(pair.userCId ? [pair.userCId] : [])];
            for (const memberId of memberIds) {
              await tx.buddyPairMember.create({
                data: {
                  organizationId: preview.organizationId,
                  cohortId: preview.cohortId,
                  buddyPairId: buddyPair.id,
                  userId: memberId,
                },
              });
            }
            createdPairCount++;
          } catch (err) {
            log.warn('Failed to create buddy pair', { pair, error: err });
          }
        }
      },
      { isolationLevel: 'Serializable' }
    );

    await invalidatePreview(data.previewToken);

    await logAudit({
      action: AuditAction.BULK_PAIRING_COMMIT,
      organizationId: preview.organizationId,
      actorUserId: user.id,
      entityType: 'BulkPairingBatch',
      entityId: data.previewToken,
      afterValue: {
        batchType: 'BUDDY_GENERATE',
        cohortId: data.cohortId,
        pairCount: createdPairCount,
        crossRatio: preview.metadata.crossRatio,
      },
    });

    ctx.log.info('Buddy Pair generation committed', {
      cohortId: data.cohortId,
      createdPairCount,
    });

    return ApiResponse.success({
      committed: true,
      pairCount: createdPairCount,
      crossRatio: preview.metadata.crossRatio,
    });
  },
});
