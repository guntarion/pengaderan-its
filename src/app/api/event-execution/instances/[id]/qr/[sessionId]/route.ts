/**
 * src/app/api/event-execution/instances/[id]/qr/[sessionId]/route.ts
 * NAWASENA M08 — Revoke a specific QR session.
 *
 * DELETE /api/event-execution/instances/[id]/qr/[sessionId]
 *   - Revoke an active QR session
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { revokeQRSession } from '@/lib/event-execution/services/qr.service';
import { revokeQRSessionSchema } from '@/lib/event-execution/schemas';

export const DELETE = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { sessionId } = params as { id: string; sessionId: string };

    let body: { reason?: string } = {};
    try {
      body = await validateBody(req, revokeQRSessionSchema.omit({ sessionId: true }));
    } catch {
      // No body is ok — reason is optional
    }

    log.info('Revoking QR session', { sessionId, userId: user.id });

    await revokeQRSession(
      { sessionId, reason: body.reason },
      user.id,
      user.organizationId!,
    );

    return ApiResponse.success({ revoked: true });
  },
});
