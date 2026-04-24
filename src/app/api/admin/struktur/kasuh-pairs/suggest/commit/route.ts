/**
 * POST /api/admin/struktur/kasuh-pairs/suggest/commit
 * Commit SC's Kasuh picks to database.
 * Advisory lock + Serializable isolation.
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, BadRequestError } from '@/lib/api';
import { kasuhSuggestCommitSchema } from '@/lib/schemas/kp-group';
import { readPreview, invalidatePreview } from '@/lib/preview-cache';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('kasuh-pair-commit');

export const POST = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const data = await validateBody(req, kasuhSuggestCommitSchema);
    const user = ctx.user as { id: string };

    const preview = await readPreview<{ cohortId: string; organizationId: string; actorUserId: string }>(
      data.previewToken
    );
    if (!preview) {
      throw BadRequestError('Preview token tidak valid atau sudah kedaluwarsa');
    }

    if (preview.cohortId !== data.cohortId) {
      throw BadRequestError('Preview token tidak cocok dengan cohort');
    }

    ctx.log.info('Committing Kasuh pairs', {
      cohortId: data.cohortId,
      pairCount: data.picks.length,
    });

    const lockKey = BigInt(
      preview.cohortId.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffffff, 0)
        + 2 // +2 to distinguish from other locks
    );

    let createdCount = 0;

    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

        for (const pick of data.picks) {
          try {
            // Verify kasuh capacity
            const kasuhCount = await tx.kasuhPair.count({
              where: { kasuhUserId: pick.kasuhUserId, cohortId: data.cohortId, status: 'ACTIVE' },
            });

            if (kasuhCount >= 2) {
              log.warn('Kasuh at capacity, skipping', { kasuhUserId: pick.kasuhUserId });
              continue;
            }

            await tx.kasuhPair.create({
              data: {
                organizationId: preview.organizationId,
                cohortId: data.cohortId,
                mabaUserId: pick.mabaUserId,
                kasuhUserId: pick.kasuhUserId,
                matchScore: 0.0, // will be filled from suggestion data if available
                matchReasons: [],
                algorithmVersion: 'v1.0-jaccard',
                status: 'ACTIVE',
                createdBy: user.id,
              },
            });
            createdCount++;
          } catch (err) {
            log.warn('Failed to create Kasuh pair', { pick, error: err });
          }
        }

        // Record batch
        await tx.bulkPairingBatch.create({
          data: {
            organizationId: preview.organizationId,
            cohortId: data.cohortId,
            batchType: 'KASUH_SUGGEST',
            algorithmVersion: 'v1.0-jaccard',
            seed: 'none',
            inputHash: '',
            summary: { totalPicks: data.picks.length, created: createdCount },
            committedBy: user.id,
            previewTokenHash: data.previewToken.slice(0, 8),
          },
        });
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
      afterValue: { batchType: 'KASUH_SUGGEST', cohortId: data.cohortId, created: createdCount },
    });

    return ApiResponse.success({ committed: true, created: createdCount });
  },
});
