/**
 * src/app/api/safeguard/incidents/safe-word/route.ts
 * NAWASENA M10 — Safe Word quick report (F1 widget, KP only).
 *
 * POST /api/safeguard/incidents/safe-word
 * Auto-fills: type=SAFE_WORD, severity=RED, status=OPEN, occurredAt=now()
 */

import {
  createApiHandler,
  ApiResponse,
  validateBody,
} from '@/lib/api';
import { UserRole, IncidentType, IncidentSeverity } from '@prisma/client';
import { createIncident } from '@/lib/safeguard/incident-service';
import { safeWordQuickSchema } from '@/lib/safeguard/schemas';

export const POST = createApiHandler({
  roles: [UserRole.KP] as string[],
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, safeWordQuickSchema);

    log.info('Safe word quick report', { actorId: user.id, cohortId: body.cohortId });

    const affectedUserIds = body.affectedUserIds ?? [];
    const primaryAffectedUserId = affectedUserIds[0] ?? undefined;
    const additionalAffectedUserIds = affectedUserIds.slice(1);

    const incident = await createIncident(
      {
        type: IncidentType.SAFE_WORD,
        severity: IncidentSeverity.RED,
        occurredAt: new Date().toISOString(),
        cohortId: body.cohortId,
        kpGroupId: body.kpGroupId,
        affectedUserId: primaryAffectedUserId,
        additionalAffectedUserIds,
        actionTaken: undefined,
        notes: {
          source: 'SAFE_WORD_QUICK',
          reasonShort: body.reasonShort,
        },
      },
      {
        id: user.id,
        role: user.role as UserRole,
        isSafeguardOfficer: false,
        organizationId: user.organizationId!,
      },
      {
        ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    );

    log.info('Safe word incident created', { id: incident.id });

    return ApiResponse.success(
      {
        incidentId: incident.id,
        status: incident.status,
        detailUrl: `/dashboard/safeguard/incidents/${incident.id}`,
      },
      201,
    );
  },
});
