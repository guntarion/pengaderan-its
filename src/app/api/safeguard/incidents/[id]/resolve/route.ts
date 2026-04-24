/**
 * src/app/api/safeguard/incidents/[id]/resolve/route.ts
 * NAWASENA M10 — Resolve incident: IN_REVIEW → RESOLVED (SC, Safeguard Officer).
 */

import {
  createApiHandler,
  ApiResponse,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  validateBody,
} from '@/lib/api';
import { UserRole, IncidentStatus } from '@prisma/client';
import { transitionStatus } from '@/lib/safeguard/incident-service';
import { resolveSchema } from '@/lib/safeguard/schemas';

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log }) => {
    const isSafeguardOfficer =
      (user as { isSafeguardOfficer?: boolean }).isSafeguardOfficer ?? false;
    const canResolve = user.role === UserRole.SC || isSafeguardOfficer;

    if (!canResolve) throw ForbiddenError('Only SC or Safeguard Officers can resolve incidents');

    const { id } = params;
    const body = await validateBody(req, resolveSchema);

    log.info('Resolving incident', { incidentId: id, actorId: user.id });

    try {
      const updated = await transitionStatus(
        id,
        IncidentStatus.RESOLVED,
        {
          id: user.id,
          role: user.role as UserRole,
          isSafeguardOfficer,
          organizationId: user.organizationId!,
        },
        { type: 'RESOLVE', resolutionNote: body.resolutionNote },
        {
          ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      );

      log.info('Incident resolved', { incidentId: id });
      return ApiResponse.success({ id: updated.id, status: updated.status });
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.message?.includes('not found')) throw NotFoundError('Incident');
      if (e.code === 'CONFLICT') throw ConflictError(e.message);
      if (e.code === 'INVALID_TRANSITION') throw BadRequestError(e.message ?? 'Invalid transition');
      throw err;
    }
  },
});
