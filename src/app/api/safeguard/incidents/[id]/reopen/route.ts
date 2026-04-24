/**
 * src/app/api/safeguard/incidents/[id]/reopen/route.ts
 * NAWASENA M10 — Reopen incident: RESOLVED → IN_REVIEW (SC only).
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
import { reopenSchema } from '@/lib/safeguard/schemas';

export const POST = createApiHandler({
  roles: [UserRole.SC] as string[],
  handler: async (req, { user, params, log }) => {
    const { id } = params;
    const body = await validateBody(req, reopenSchema);

    log.info('Reopening incident', { incidentId: id, actorId: user.id });

    try {
      const updated = await transitionStatus(
        id,
        IncidentStatus.IN_REVIEW,
        {
          id: user.id,
          role: user.role as UserRole,
          isSafeguardOfficer: false,
          organizationId: user.organizationId!,
        },
        { type: 'REOPEN', reason: body.reason },
        {
          ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      );

      log.info('Incident reopened', { incidentId: id });
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
