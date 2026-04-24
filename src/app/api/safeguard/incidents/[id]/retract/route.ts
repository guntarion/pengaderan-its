/**
 * src/app/api/safeguard/incidents/[id]/retract/route.ts
 * NAWASENA M10 — Retract incident.
 *
 * Reporter within 30 min → RETRACTED_BY_REPORTER
 * SC → RETRACTED_BY_SC
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
import { prisma } from '@/utils/prisma';
import { UserRole, IncidentStatus } from '@prisma/client';
import { transitionStatus } from '@/lib/safeguard/incident-service';
import { retractSchema } from '@/lib/safeguard/schemas';
import { RETRACTION_WINDOW_MS } from '@/lib/safeguard/state-machine';

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log }) => {
    const { id } = params;
    const body = await validateBody(req, retractSchema);

    const incident = await prisma.safeguardIncident.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        status: true,
        reportedById: true,
        createdAt: true,
      },
    });

    if (!incident) throw NotFoundError('Incident');
    if (incident.organizationId !== user.organizationId) throw ForbiddenError('Access denied');

    const isReporter = user.id === incident.reportedById;
    const isSC = user.role === UserRole.SC;

    if (!isReporter && !isSC) {
      throw ForbiddenError('Only the reporter or SC can retract incidents');
    }

    // Determine target status
    let targetStatus: IncidentStatus;

    if (isSC) {
      targetStatus = IncidentStatus.RETRACTED_BY_SC;
    } else {
      // Reporter: check window
      const ageMs = Date.now() - incident.createdAt.getTime();
      if (ageMs > RETRACTION_WINDOW_MS) {
        throw ForbiddenError(`Retraction window expired (${RETRACTION_WINDOW_MS / 60000} minutes)`);
      }
      targetStatus = IncidentStatus.RETRACTED_BY_REPORTER;
    }

    log.info('Retracting incident', {
      incidentId: id,
      actorId: user.id,
      targetStatus,
    });

    try {
      const updated = await transitionStatus(
        id,
        targetStatus,
        {
          id: user.id,
          role: user.role as UserRole,
          isSafeguardOfficer: false,
          organizationId: user.organizationId!,
        },
        { type: 'RETRACT', reason: body.reason },
        {
          ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      );

      log.info('Incident retracted', { incidentId: id, targetStatus });
      return ApiResponse.success({ id: updated.id, status: updated.status });
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'CONFLICT') throw ConflictError(e.message);
      if (e.code === 'INVALID_TRANSITION') throw BadRequestError(e.message ?? 'Invalid transition');
      throw err;
    }
  },
});
