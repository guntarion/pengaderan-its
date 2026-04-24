/**
 * src/app/api/safeguard/incidents/[id]/timeline/route.ts
 * NAWASENA M10 — Get incident timeline entries (SC, Safeguard Officer, Pembina).
 */

import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  NotFoundError,
  ForbiddenError,
} from '@/lib/api';
import { UserRole } from '@prisma/client';

const VIEW_ROLES = [
  UserRole.SC,
  UserRole.SATGAS,
  UserRole.PEMBINA,
  UserRole.OC,
  UserRole.KP,
] as string[];

export const GET = createApiHandler({
  roles: VIEW_ROLES,
  handler: async (req, { user, params, log }) => {
    const { id } = params;

    log.info('Fetching timeline', { incidentId: id, userId: user.id });

    // Verify incident exists + org scope
    const incident = await prisma.safeguardIncident.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!incident) throw NotFoundError('Incident');
    if (incident.organizationId !== user.organizationId) throw ForbiddenError('Access denied');

    const entries = await prisma.incidentTimelineEntry.findMany({
      where: { incidentId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: { id: true, displayName: true, fullName: true, role: true },
        },
      },
    });

    log.info('Timeline fetched', { incidentId: id, count: entries.length });

    return ApiResponse.success(entries);
  },
});
