/**
 * src/app/api/anon-reports/[id]/escalate/route.ts
 * POST /api/anon-reports/[id]/escalate
 *
 * Manual escalation to Satgas by BLM/SUPERADMIN.
 * Marks report as satgasEscalated=true and triggers M15 CRITICAL notification.
 *
 * MANDATORY: recordAnonAccess must be imported and called.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateParams, idParamSchema, NotFoundError, BadRequestError } from '@/lib/api';
import { setAnonSessionVars } from '@/lib/anon-report/rls-helpers';
import { recordAnonAccess } from '@/lib/anon-report/access-log'; // MANDATORY — do not remove
import { AnonAccessAction, AnonStatus } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('anon-escalate');

export const POST = createApiHandler({
  roles: ['BLM', 'SUPERADMIN'],
  handler: async (_req, { user, params }) => {
    const { id } = validateParams(params, idParamSchema);

    log.info('Manual escalation requested', { role: user.role });

    const result = await prisma.$transaction(async (tx) => {
      await setAnonSessionVars(tx, user);

      const existing = await tx.anonReport.findUnique({
        where: { id },
        select: { id: true, status: true, satgasEscalated: true },
      });

      if (!existing) throw NotFoundError('Laporan');

      if (existing.satgasEscalated) {
        throw BadRequestError('Laporan sudah diteruskan ke Satgas sebelumnya.');
      }

      const updated = await tx.anonReport.update({
        where: { id },
        data: {
          satgasEscalated: true,
          satgasEscalatedAt: new Date(),
          status: AnonStatus.ESCALATED_TO_SATGAS,
        },
      });

      await recordAnonAccess(tx, user, id, AnonAccessAction.ESCALATE, {
        statusBefore: existing.status,
        escalatedBy: user.id,
      });

      return updated;
    });

    // Phase E will trigger M15 CRITICAL notification here
    log.info('Report escalated to Satgas', { reportId: id.slice(0, 8) + '...' });

    return ApiResponse.success(result);
  },
});
