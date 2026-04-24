/**
 * POST /api/admin/struktur/kp-groups/bulk-assign/commit
 * Commit bulk KP Group assignment from preview token.
 *
 * Uses advisory lock + Serializable isolation to prevent race conditions.
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, BadRequestError } from '@/lib/api';
import { bulkAssignCommitSchema } from '@/lib/schemas/kp-group';
import { readPreview, invalidatePreview } from '@/lib/preview-cache';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('kp-group-bulk-commit');

interface PreviewData {
  cohortId: string;
  organizationId: string;
  actorUserId: string;
  mode: string;
  seed?: string;
  assignments: Array<{ userId: string; kpGroupId: string }>;
  metadata: Record<string, unknown>;
}

export const POST = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const data = await validateBody(req, bulkAssignCommitSchema);
    const user = ctx.user as { id: string };

    // Retrieve preview from cache
    const preview = await readPreview<PreviewData>(data.previewToken);
    if (!preview) {
      throw BadRequestError('Preview token tidak valid atau sudah kedaluwarsa. Silakan generate ulang.');
    }

    if (preview.cohortId !== data.cohortId) {
      throw BadRequestError('Preview token tidak cocok dengan cohort yang diminta');
    }

    ctx.log.info('Committing bulk KP Group assignment', {
      cohortId: data.cohortId,
      assignmentCount: preview.assignments.length,
    });

    // Advisory lock key: hash of cohortId + 'kp_group_bulk'
    const lockKey = BigInt(
      preview.cohortId.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffffff, 0)
    );

    let createdCount = 0;
    let errorCount = 0;

    // Serializable transaction with advisory lock
    await prisma.$transaction(
      async (tx) => {
        // Advisory lock to prevent concurrent bulk commits for same cohort
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

        // Create KPGroupMember records
        for (const assignment of preview.assignments) {
          try {
            // Get group to check organizationId
            const group = await tx.kPGroup.findUnique({
              where: { id: assignment.kpGroupId },
              select: { organizationId: true, cohortId: true },
            });
            if (!group) {
              log.warn('KP Group not found during bulk commit', { kpGroupId: assignment.kpGroupId });
              errorCount++;
              continue;
            }

            // Check if member already assigned (idempotent)
            const existing = await tx.kPGroupMember.findFirst({
              where: {
                cohortId: preview.cohortId,
                userId: assignment.userId,
                status: 'ACTIVE',
              },
            });
            if (existing) {
              log.debug('Member already assigned, skipping', { userId: assignment.userId });
              continue;
            }

            await tx.kPGroupMember.create({
              data: {
                organizationId: group.organizationId,
                cohortId: preview.cohortId,
                kpGroupId: assignment.kpGroupId,
                userId: assignment.userId,
                memberType: 'MABA',
              },
            });
            createdCount++;
          } catch (err) {
            log.warn('Failed to create KPGroupMember', { userId: assignment.userId, error: err });
            errorCount++;
          }
        }

        // Record bulk batch metadata
        await tx.bulkPairingBatch.create({
          data: {
            organizationId: preview.organizationId,
            cohortId: preview.cohortId,
            batchType: 'KP_GROUP_ASSIGN',
            algorithmVersion: 'v1.0',
            seed: preview.seed ?? 'none',
            inputHash: (preview.metadata.inputHash as string) ?? '',
            summary: {
              totalAssignments: preview.assignments.length,
              created: createdCount,
              skipped: preview.assignments.length - createdCount - errorCount,
              errors: errorCount,
              mode: preview.mode,
            },
            committedBy: user.id,
            previewTokenHash: data.previewToken.slice(0, 8),
          },
        });
      },
      { isolationLevel: 'Serializable' }
    );

    // Invalidate preview token (one-time use)
    await invalidatePreview(data.previewToken);

    await logAudit({
      action: AuditAction.BULK_PAIRING_COMMIT,
      organizationId: preview.organizationId,
      actorUserId: user.id,
      entityType: 'BulkPairingBatch',
      entityId: data.previewToken,
      afterValue: {
        batchType: 'KP_GROUP_ASSIGN',
        cohortId: data.cohortId,
        totalAssignments: preview.assignments.length,
        created: createdCount,
        errors: errorCount,
      },
    });

    ctx.log.info('Bulk KP Group assignment committed', {
      cohortId: data.cohortId,
      created: createdCount,
      errors: errorCount,
    });

    return ApiResponse.success({
      committed: true,
      created: createdCount,
      skipped: preview.assignments.length - createdCount - errorCount,
      errors: errorCount,
    });
  },
});
