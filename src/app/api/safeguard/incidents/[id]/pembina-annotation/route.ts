/**
 * src/app/api/safeguard/incidents/[id]/pembina-annotation/route.ts
 * NAWASENA M10 — Add Pembina annotation (Pembina only).
 */

import {
  createApiHandler,
  ApiResponse,
  NotFoundError,
  ForbiddenError,
  validateBody,
} from '@/lib/api';
import { UserRole } from '@prisma/client';
import { addPembinaAnnotation } from '@/lib/safeguard/incident-service';
import { pembinaAnnotationSchema } from '@/lib/safeguard/schemas';

export const POST = createApiHandler({
  roles: [UserRole.PEMBINA] as string[],
  handler: async (req, { user, params, log }) => {
    const { id } = params;
    const body = await validateBody(req, pembinaAnnotationSchema);

    log.info('Adding Pembina annotation', { incidentId: id, actorId: user.id });

    try {
      await addPembinaAnnotation(
        id,
        body.noteText,
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

      log.info('Pembina annotation added', { incidentId: id });
      return ApiResponse.success({ added: true });
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.message?.includes('not found')) throw NotFoundError('Incident');
      throw err;
    }
  },
});
