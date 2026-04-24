/**
 * src/app/api/safeguard/incidents/route.ts
 * NAWASENA M10 — Incident list (GET) and create (POST).
 *
 * GET  /api/safeguard/incidents  — paginated list with filters (SC, SATGAS, PEMBINA, OC, KP, BLM)
 * POST /api/safeguard/incidents  — create F2 incident (SC, Safeguard Officer, OC, KP)
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateQuery, ForbiddenError } from '@/lib/api';
import { UserRole, IncidentStatus } from '@prisma/client';
import { createIncident, INCIDENT_WITH_RELATIONS } from '@/lib/safeguard/incident-service';
import { serializeIncidentForViewer } from '@/lib/safeguard/serializer';
import { createIncidentSchema, listIncidentsQuerySchema } from '@/lib/safeguard/schemas';

const LIST_ROLES = [
  UserRole.SC,
  UserRole.SATGAS,
  UserRole.PEMBINA,
  UserRole.OC,
  UserRole.KP,
  UserRole.BLM,
] as string[];

const CREATE_ROLES = [
  UserRole.SC,
  UserRole.OC,
  UserRole.KP,
] as string[];

export const GET = createApiHandler({
  roles: LIST_ROLES,
  handler: async (req, { user, log }) => {
    const query = validateQuery(req, listIncidentsQuerySchema);

    log.info('Listing incidents', {
      userId: user.id,
      role: user.role,
      filters: { severity: query.severity, status: query.status, cohortId: query.cohortId },
    });

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: user.organizationId!,
    };

    if (query.severity) where.severity = query.severity;
    if (query.cohortId) where.cohortId = query.cohortId;

    if (query.status) {
      // Support comma-separated status list
      const statuses = query.status.split(',').map((s) => s.trim()) as IncidentStatus[];
      where.status = { in: statuses };
    }

    if (query.fromDate || query.toDate) {
      where.occurredAt = {
        ...(query.fromDate && { gte: new Date(query.fromDate) }),
        ...(query.toDate && { lte: new Date(query.toDate) }),
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [incidents, total] = await Promise.all([
      prisma.safeguardIncident.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: INCIDENT_WITH_RELATIONS,
      }),
      prisma.safeguardIncident.count({ where }),
    ]);

    const viewerCtx = {
      id: user.id,
      role: user.role as UserRole,
      isSafeguardOfficer: (user as { isSafeguardOfficer?: boolean }).isSafeguardOfficer ?? false,
    };

    const serialized = incidents.map((i) => serializeIncidentForViewer(i, viewerCtx));

    log.info('Incidents listed', { count: incidents.length, total, page });

    return ApiResponse.paginated(serialized, { page, limit, total });
  },
});

export const POST = createApiHandler({
  roles: CREATE_ROLES,
  handler: async (req, { user, log }) => {
    // Also allow Safeguard Officers regardless of role
    const isSafeguardOfficer =
      (user as { isSafeguardOfficer?: boolean }).isSafeguardOfficer ?? false;
    const canCreate =
      CREATE_ROLES.includes(user.role) || isSafeguardOfficer;

    if (!canCreate) {
      throw ForbiddenError('Not authorized to create incidents');
    }

    const input = await validateBody(req, createIncidentSchema);

    log.info('Creating incident', {
      type: input.type,
      severity: input.severity,
      actorId: user.id,
    });

    const actor = {
      id: user.id,
      role: user.role as UserRole,
      isSafeguardOfficer,
      organizationId: user.organizationId!,
    };

    const incident = await createIncident(input, actor, {
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    log.info('Incident created', { id: incident.id });

    return ApiResponse.success({ id: incident.id, status: incident.status }, 201);
  },
});
