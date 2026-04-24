/**
 * src/app/api/safeguard/consequences/[id]/route.ts
 * NAWASENA M10 — Consequence detail (GET).
 *
 * GET /api/safeguard/consequences/[id] — SC/SG-Officer + maba owner
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateParams, idParamSchema, NotFoundError, ForbiddenError } from '@/lib/api';

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);

    const rawUser = ctx.user as unknown as {
      id: string;
      role: string;
      organizationId?: string;
      isSafeguardOfficer?: boolean;
    };

    const consequence = await prisma.consequenceLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, displayName: true } },
        assignedBy: { select: { id: true, fullName: true } },
        reviewedBy: { select: { id: true, fullName: true } },
        relatedIncident: {
          select: { id: true, type: true, severity: true, status: true },
        },
      },
    });

    if (!consequence) throw NotFoundError('Consequence');

    // Access control: SC, SG-Officer, or the target maba themselves
    const isScOrOfficer =
      rawUser.role === 'SC' || rawUser.isSafeguardOfficer;
    const isSelf = consequence.userId === rawUser.id;

    if (!isScOrOfficer && !isSelf) {
      throw ForbiddenError();
    }

    return ApiResponse.success(consequence);
  },
});
