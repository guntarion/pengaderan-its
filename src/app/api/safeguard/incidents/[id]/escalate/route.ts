/**
 * POST /api/safeguard/incidents/[id]/escalate
 * NAWASENA M10 — Escalate incident to Satgas: IN_REVIEW → ESCALATED_TO_SATGAS.
 *
 * Allowed roles: Safeguard Officer (isSafeguardOfficer = true) or SC.
 * Requires escalationReason ≥ 50 characters.
 */

import {
  createApiHandler,
  ApiResponse,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  validateBody,
  validateParams,
  idParamSchema,
} from '@/lib/api';
import { UserRole, IncidentStatus, EscalationTarget } from '@prisma/client';
import { transitionStatus } from '@/lib/safeguard/incident-service';
import { escalateSchema } from '@/lib/safeguard/schemas';
import type { IncidentActor } from '@/lib/safeguard/types';

export const POST = createApiHandler({
  auth: true,
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);

    const rawUser = ctx.user as unknown as {
      id: string;
      role: string;
      organizationId?: string;
      isSafeguardOfficer?: boolean;
    };

    const isSafeguardOfficer = rawUser.isSafeguardOfficer ?? false;
    const isSC = rawUser.role === UserRole.SC;

    // Escalation: SG-Officer required (SC may also escalate per state machine)
    if (!isSafeguardOfficer && !isSC) {
      throw ForbiddenError('Only Safeguard Officers can escalate incidents to Satgas');
    }

    const body = await validateBody(req, escalateSchema);

    ctx.log.info('Escalating incident', {
      incidentId: id,
      actorId: rawUser.id,
      escalatedTo: body.escalatedTo,
    });

    const actor: IncidentActor = {
      id: rawUser.id,
      role: rawUser.role as UserRole,
      isSafeguardOfficer,
      organizationId: rawUser.organizationId ?? '',
    };

    try {
      const updated = await transitionStatus(
        id,
        IncidentStatus.ESCALATED_TO_SATGAS,
        actor,
        {
          type: 'ESCALATE',
          escalationReason: body.escalationReason,
          escalatedTo: body.escalatedTo ?? EscalationTarget.SATGAS_PPKPT_ITS,
          satgasTicketRef: body.satgasTicketRef,
        },
        {
          ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      );

      ctx.log.info('Incident escalated', { incidentId: id, status: updated.status });
      return ApiResponse.success({
        id: updated.id,
        status: updated.status,
        escalatedTo: updated.escalatedTo,
        escalatedAt: updated.escalatedAt,
      });
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.message?.includes('not found')) throw NotFoundError('Incident');
      if (e.code === 'CONFLICT') throw ConflictError(e.message);
      if (e.code === 'INVALID_TRANSITION') throw BadRequestError(e.message ?? 'Invalid transition');
      throw err;
    }
  },
});
