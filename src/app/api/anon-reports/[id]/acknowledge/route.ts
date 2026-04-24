/**
 * src/app/api/anon-reports/[id]/acknowledge/route.ts
 * POST /api/anon-reports/[id]/acknowledge
 *
 * BLM acknowledges (claims) a NEW report.
 * Uses optimistic locking: UPDATE ... WHERE status = 'NEW'
 * If row count = 0 → 409 Conflict (race condition).
 *
 * MANDATORY: recordAnonAccess must be imported and called.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateParams, idParamSchema, ConflictError, NotFoundError } from '@/lib/api';
import { setAnonSessionVars } from '@/lib/anon-report/rls-helpers';
import { recordAnonAccess } from '@/lib/anon-report/access-log'; // MANDATORY — do not remove
import { AnonAccessAction, AnonStatus } from '@prisma/client';

export const POST = createApiHandler({
  roles: ['BLM', 'SUPERADMIN'],
  handler: async (_req, { user, params, log }) => {
    const { id } = validateParams(params, idParamSchema);
    log.info('Acknowledging anon report', { role: user.role });

    const result = await prisma.$transaction(async (tx) => {
      await setAnonSessionVars(tx, user);

      // Verify report exists and is accessible
      const existing = await tx.anonReport.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existing) throw NotFoundError('Laporan');

      if (existing.status !== AnonStatus.NEW) {
        throw ConflictError(
          `Laporan sudah di-acknowledge oleh petugas lain. Status saat ini: ${existing.status}`,
        );
      }

      // Optimistic lock: only update if status is still NEW
      const updated = await tx.anonReport.updateMany({
        where: { id, status: AnonStatus.NEW },
        data: {
          status: AnonStatus.IN_REVIEW,
          acknowledgedById: user.id,
          acknowledgedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        throw ConflictError('Laporan sudah di-acknowledge oleh petugas lain.');
      }

      // Mandatory audit entry
      await recordAnonAccess(tx, user, id, AnonAccessAction.STATUS_CHANGE, {
        statusBefore: AnonStatus.NEW,
        statusAfter: AnonStatus.IN_REVIEW,
      });

      return tx.anonReport.findUnique({ where: { id } });
    });

    log.info('Report acknowledged', { reportId: id.slice(0, 8) + '...' });
    return ApiResponse.success(result);
  },
});
