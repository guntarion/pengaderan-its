/**
 * src/app/api/kasuh/log/[pairId]/route.ts
 * NAWASENA M09 — Kasuh logbook CRUD for a specific pair
 *
 * GET  /api/kasuh/log/[pairId]  — Form state for current cycle
 * POST /api/kasuh/log/[pairId]  — Submit Kasuh log
 *
 * Roles: KASUH
 */

import { createApiHandler, ApiResponse, validateBody, validateParams } from '@/lib/api';
import { NotFoundError } from '@/lib/api';
import { z } from 'zod';
import { kasuhLogSchema, type KasuhLogInput } from '@/lib/m09-logbook/validation/kasuh-log.schema';
import { getFormState, submitKasuhLog } from '@/lib/m09-logbook/kasuh-log.service';
import { prisma } from '@/utils/prisma';

const pairIdSchema = z.object({ pairId: z.string().min(1) });

export const GET = createApiHandler({
  roles: ['KASUH'],
  handler: async (_req, ctx) => {
    const kasuhUserId = ctx.user.id;
    const { pairId } = validateParams(ctx.params, pairIdSchema);

    ctx.log.info('Fetching Kasuh form state', { kasuhUserId, pairId });

    const formState = await getFormState(kasuhUserId, pairId);

    return ApiResponse.success(formState);
  },
});

export const POST = createApiHandler({
  roles: ['KASUH'],
  handler: async (req, ctx) => {
    const kasuhUserId = ctx.user.id;
    const { pairId } = validateParams(ctx.params, pairIdSchema);

    ctx.log.info('Submitting Kasuh log', { kasuhUserId, pairId });

    const body = (await validateBody(req, kasuhLogSchema)) as KasuhLogInput;

    // Verify pairId matches payload
    if (body.pairId !== pairId) {
      throw NotFoundError('Pair ID tidak sesuai');
    }

    // Get KP user context
    const kasuhUser = await prisma.user.findUnique({
      where: { id: kasuhUserId },
      select: { organizationId: true, currentCohortId: true },
    });

    if (!kasuhUser?.currentCohortId) {
      throw NotFoundError('Cohort aktif tidak ditemukan');
    }

    const logEntry = await submitKasuhLog(
      kasuhUserId,
      kasuhUser.organizationId,
      kasuhUser.currentCohortId,
      body,
      req,
    );

    ctx.log.info('Kasuh log submitted', { logId: logEntry.id, kasuhUserId });

    return ApiResponse.success(logEntry, 201);
  },
});
