/**
 * src/app/api/safeguard/incidents/[id]/claim/route.ts
 * NAWASENA M10 — Claim incident: OPEN → IN_REVIEW (SC, Safeguard Officer).
 */

import {
  createApiHandler,
  ApiResponse,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '@/lib/api';
import { UserRole, IncidentStatus } from '@prisma/client';
import { transitionStatus } from '@/lib/safeguard/incident-service';

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log }) => {
    const isSafeguardOfficer =
      (user as { isSafeguardOfficer?: boolean }).isSafeguardOfficer ?? false;
    const canClaim = user.role === UserRole.SC || isSafeguardOfficer;

    if (!canClaim) throw ForbiddenError('Only SC or Safeguard Officers can claim incidents');

    const { id } = params;

    log.info('Claiming incident', { incidentId: id, actorId: user.id });

    try {
      const updated = await transitionStatus(
        id,
        IncidentStatus.IN_REVIEW,
        {
          id: user.id,
          role: user.role as UserRole,
          isSafeguardOfficer,
          organizationId: user.organizationId!,
        },
        { type: 'CLAIM' },
        {
          ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      );

      log.info('Incident claimed', { incidentId: id });
      return ApiResponse.success({ id: updated.id, status: updated.status, claimedById: updated.claimedById });
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.message?.includes('not found')) throw NotFoundError('Incident');
      if (e.code === 'CONFLICT') throw ConflictError(e.message);
      if (e.code === 'INVALID_TRANSITION') throw BadRequestError(e.message ?? 'Invalid transition');
      throw err;
    }
  },
});
