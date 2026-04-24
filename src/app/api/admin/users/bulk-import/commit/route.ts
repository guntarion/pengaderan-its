/**
 * POST /api/admin/users/bulk-import/commit
 * Commit a previously previewed bulk user import.
 *
 * Roles: SC, SUPERADMIN
 * Body: { previewToken: string, decisions: Record<string, 'SKIP' | 'UPDATE'> }
 *
 * The `decisions` map keys are email addresses of existing users found during preview.
 * If not provided for an existing user, defaults to 'SKIP'.
 *
 * Response: { committed, updated, skipped, failed, auditId }
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { BadRequestError, NotFoundError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import { getPreview } from '@/lib/bulk-import/preview-cache';
import { logBulkImport } from '@/lib/audit/audit-helpers';
import type { UserRole } from '@prisma/client';

const CHUNK_SIZE = 50; // rows per transaction batch

const commitSchema = z.object({
  previewToken: z.string().uuid('Token tidak valid'),
  decisions: z.record(z.enum(['SKIP', 'UPDATE'])).optional().default({}),
});

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, commitSchema);
    const { previewToken, decisions = {} } = body;

    // 1. Fetch and consume the preview from cache (one-time use)
    const cached = await getPreview(previewToken, true);
    if (!cached) {
      throw NotFoundError('Preview token tidak ditemukan atau sudah kadaluarsa (10 menit)');
    }

    // 2. Security: verify the commit actor matches the preview actor or is SUPERADMIN
    if (
      cached.actorUserId !== user.id &&
      user.role !== 'SUPERADMIN'
    ) {
      throw BadRequestError('Token ini dibuat oleh user lain');
    }

    // 3. Security: verify organization scope matches
    const orgId = cached.organizationId;
    if (user.role !== 'SUPERADMIN' && user.organizationId !== orgId) {
      throw BadRequestError('Token ini milik organisasi yang berbeda');
    }

    const { validRows, errorRows } = cached.parseResult;
    const { cohortIds, fileHash } = cached;

    log.info('Starting bulk import commit', {
      previewToken: previewToken.slice(0, 8) + '...',
      validRows: validRows.length,
      errorRows: errorRows.length,
      orgId,
    });

    // 4. Chunk the valid rows for batch transaction
    const results = {
      committed: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      failedRows: [] as { lineNumber: number; email: string; error: string }[],
    };

    // Check existing emails up front
    const emails = validRows.map((r) => r.data!.email);
    const existingUsers = await prisma.user.findMany({
      where: { organizationId: orgId, email: { in: emails } },
      select: { email: true, id: true },
    });
    const existingMap = new Map(existingUsers.map((u) => [u.email, u.id]));

    // Split into chunks of CHUNK_SIZE
    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + CHUNK_SIZE);

      try {
        await prisma.$transaction(async (tx) => {
          for (const row of chunk) {
            const { email, nrp, fullName, displayName, role, cohortCode } = row.data!;
            const cohortId = cohortIds[cohortCode];

            if (!cohortId) {
              // Cohort was invalidated between preview and commit (edge case)
              results.failed++;
              results.failedRows.push({
                lineNumber: row.lineNumber,
                email,
                error: `Cohort "${cohortCode}" tidak ditemukan`,
              });
              continue;
            }

            const existingUserId = existingMap.get(email);

            if (existingUserId) {
              const decision = decisions[email] ?? 'SKIP';
              if (decision === 'SKIP') {
                results.skipped++;
                continue;
              }
              // UPDATE: update role, cohort, name
              await tx.user.update({
                where: { id: existingUserId },
                data: {
                  fullName,
                  displayName: displayName ?? undefined,
                  role: role as UserRole,
                  currentCohortId: cohortId,
                },
              });
              results.updated++;
            } else {
              // CREATE new user
              await tx.user.create({
                data: {
                  email,
                  nrp: nrp ?? null,
                  fullName,
                  displayName: displayName ?? null,
                  role: role as UserRole,
                  organizationId: orgId,
                  currentCohortId: cohortId,
                  // status defaults to PENDING_PROFILE_SETUP per schema
                },
              });
              results.committed++;
            }

            // Mark whitelist as consumed if entry exists
            await tx.whitelistEmail
              .updateMany({
                where: {
                  organizationId: orgId,
                  email,
                  isConsumed: false,
                },
                data: {
                  isConsumed: true,
                  consumedAt: new Date(),
                },
              })
              .catch(() => {
                // Whitelist entry may not exist — not an error
              });
          }
        });
      } catch (err) {
        log.error('Chunk transaction failed', {
          chunk: i / CHUNK_SIZE + 1,
          error: err,
        });
        // Mark all rows in this chunk as failed
        for (const row of chunk) {
          results.failed++;
          results.failedRows.push({
            lineNumber: row.lineNumber,
            email: row.data!.email,
            error: err instanceof Error ? err.message : 'Transaksi gagal',
          });
        }
      }
    }

    // 5. Write single audit log entry for the entire import
    await logBulkImport({
      actorUserId: user.id,
      organizationId: orgId,
      fileHash,
      totalRows: validRows.length,
      committed: results.committed,
      updated: results.updated,
      skipped: results.skipped,
      failed: results.failed,
    });

    log.info('Bulk import commit complete', results);

    return ApiResponse.success({
      committed: results.committed,
      updated: results.updated,
      skipped: results.skipped,
      failed: results.failed,
      failedRows: results.failedRows,
    });
  },
});
