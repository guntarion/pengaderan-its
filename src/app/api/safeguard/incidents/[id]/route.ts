/**
 * src/app/api/safeguard/incidents/[id]/route.ts
 * NAWASENA M10 — Incident detail (GET) and partial update (PATCH).
 *
 * GET   /api/safeguard/incidents/[id] — detail (SC, Safeguard Officer, PEMBINA, OC, KP)
 * PATCH /api/safeguard/incidents/[id] — partial update non-status fields (SC, Safeguard Officer)
 */

import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateBody,
  NotFoundError,
  ForbiddenError,
} from '@/lib/api';
import { UserRole } from '@prisma/client';
import { updateIncidentFields, INCIDENT_WITH_RELATIONS } from '@/lib/safeguard/incident-service';
import { serializeIncidentForViewer } from '@/lib/safeguard/serializer';
import { updateIncidentSchema } from '@/lib/safeguard/schemas';

const VIEW_ROLES = [
  UserRole.SC,
  UserRole.SATGAS,
  UserRole.PEMBINA,
  UserRole.OC,
  UserRole.KP,
  UserRole.BLM,
] as string[];

export const GET = createApiHandler({
  roles: VIEW_ROLES,
  handler: async (req, { user, params, log }) => {
    const { id } = params;

    log.info('Fetching incident detail', { incidentId: id, userId: user.id });

    const incident = await prisma.safeguardIncident.findUnique({
      where: { id },
      include: INCIDENT_WITH_RELATIONS,
    });

    if (!incident) throw NotFoundError('Incident');

    if (incident.organizationId !== user.organizationId) {
      throw ForbiddenError('Access denied');
    }

    const viewerCtx = {
      id: user.id,
      role: user.role as UserRole,
      isSafeguardOfficer:
        (user as { isSafeguardOfficer?: boolean }).isSafeguardOfficer ?? false,
    };

    const serialized = serializeIncidentForViewer(incident, viewerCtx);

    log.info('Incident detail fetched', { incidentId: id });

    return ApiResponse.success(serialized);
  },
});

export const PATCH = createApiHandler({
  roles: [UserRole.SC] as string[],
  handler: async (req, { user, params, log }) => {
    const isSafeguardOfficer =
      (user as { isSafeguardOfficer?: boolean }).isSafeguardOfficer ?? false;
    const canUpdate = user.role === UserRole.SC || isSafeguardOfficer;

    if (!canUpdate) throw ForbiddenError('Only SC or Safeguard Officers can update incidents');

    const { id } = params;
    const patch = await validateBody(req, updateIncidentSchema);

    log.info('Updating incident fields', { incidentId: id, userId: user.id });

    const actor = {
      id: user.id,
      role: user.role as UserRole,
      isSafeguardOfficer,
      organizationId: user.organizationId!,
    };

    const updated = await updateIncidentFields(id, patch, actor, {
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    log.info('Incident fields updated', { incidentId: id });

    return ApiResponse.success({ id: updated.id, status: updated.status });
  },
});
