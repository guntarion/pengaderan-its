/**
 * src/app/api/safeguard/incidents/[id]/notes/route.ts
 * NAWASENA M10 — Add note to incident timeline (SC, Safeguard Officer).
 */

import {
  createApiHandler,
  ApiResponse,
  NotFoundError,
  ForbiddenError,
  validateBody,
} from '@/lib/api';
import { UserRole } from '@prisma/client';
import { addIncidentNote } from '@/lib/safeguard/incident-service';
import { addNoteSchema } from '@/lib/safeguard/schemas';

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log }) => {
    const isSafeguardOfficer =
      (user as { isSafeguardOfficer?: boolean }).isSafeguardOfficer ?? false;
    const canAddNote = user.role === UserRole.SC || isSafeguardOfficer;

    if (!canAddNote) throw ForbiddenError('Only SC or Safeguard Officers can add notes');

    const { id } = params;
    const body = await validateBody(req, addNoteSchema);

    log.info('Adding note to incident', { incidentId: id, actorId: user.id });

    try {
      await addIncidentNote(
        id,
        body.noteText,
        {
          id: user.id,
          role: user.role as UserRole,
          isSafeguardOfficer,
          organizationId: user.organizationId!,
        },
        {
          ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      );

      log.info('Note added', { incidentId: id });
      return ApiResponse.success({ added: true });
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.message?.includes('not found')) throw NotFoundError('Incident');
      throw err;
    }
  },
});
