/**
 * src/app/api/kasuh/log/[pairId]/history/route.ts
 * NAWASENA M09 — Kasuh log cycle history
 *
 * GET /api/kasuh/log/[pairId]/history
 * Roles: KASUH
 */

import { createApiHandler, ApiResponse, validateParams } from '@/lib/api';
import { ForbiddenError } from '@/lib/api';
import { z } from 'zod';
import { getKasuhLogHistory } from '@/lib/m09-logbook/kasuh-log.service';
import { prisma } from '@/utils/prisma';

const pairIdSchema = z.object({ pairId: z.string().min(1) });

export const GET = createApiHandler({
  roles: ['KASUH'],
  handler: async (_req, ctx) => {
    const kasuhUserId = ctx.user.id;
    const { pairId } = validateParams(ctx.params, pairIdSchema);

    ctx.log.info('Fetching Kasuh log history', { kasuhUserId, pairId });

    // Verify ownership
    const pair = await prisma.kasuhPair.findUnique({
      where: { id: pairId },
      select: { kasuhUserId: true },
    });

    if (!pair || pair.kasuhUserId !== kasuhUserId) {
      throw ForbiddenError('Tidak memiliki akses ke pair ini');
    }

    const history = await getKasuhLogHistory(pairId);

    return ApiResponse.success(history);
  },
});
