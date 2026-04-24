/**
 * src/app/api/anon-reports/[id]/resolve/route.ts
 * POST /api/anon-reports/[id]/resolve
 *
 * Resolve a report. Requires mandatory resolution notes.
 * Status transition: IN_REVIEW → RESOLVED (or ESCALATED_TO_SATGAS → RESOLVED)
 *
 * MANDATORY: recordAnonAccess must be imported and called.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema, NotFoundError, BadRequestError } from '@/lib/api';
import { setAnonSessionVars } from '@/lib/anon-report/rls-helpers';
import { recordAnonAccess } from '@/lib/anon-report/access-log'; // MANDATORY — do not remove
import { resolveSchema } from '@/lib/anon-report/schemas';
import { AnonAccessAction, AnonStatus } from '@prisma/client';

export const POST = createApiHandler({
  roles: ['BLM', 'SATGAS_PPKPT', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { id } = validateParams(params, idParamSchema);
    const body = await validateBody(req, resolveSchema);

    log.info('Resolving anon report', { role: user.role });

    const result = await prisma.$transaction(async (tx) => {
      await setAnonSessionVars(tx, user);

      const existing = await tx.anonReport.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existing) throw NotFoundError('Laporan');

      if (existing.status === AnonStatus.RESOLVED) {
        throw BadRequestError('Laporan sudah diselesaikan.');
      }

      const updated = await tx.anonReport.update({
        where: { id },
        data: {
          status: AnonStatus.RESOLVED,
          resolutionNotes: body.resolutionNotes,
          publicNote: body.publicNote ?? undefined,
          closedAt: body.closedAt ? new Date(body.closedAt) : new Date(),
        },
      });

      await recordAnonAccess(tx, user, id, AnonAccessAction.STATUS_CHANGE, {
        statusBefore: existing.status,
        statusAfter: AnonStatus.RESOLVED,
      });

      return updated;
    });

    log.info('Report resolved', { reportId: id.slice(0, 8) + '...' });
    return ApiResponse.success(result);
  },
});
