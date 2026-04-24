/**
 * src/app/api/admin/passport/qr-session/[id]/route.ts
 * NAWASENA M05 — DELETE: Revoke a QR session.
 */

import {
  createApiHandler,
  ApiResponse,
  validateParams,
  validateBody,
  idParamSchema,
} from '@/lib/api';
import { revokeQrSession } from '@/lib/passport/qr-session.service';
import { z } from 'zod';

const revokeSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const DELETE = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { id: sessionId } = validateParams(params, idParamSchema);
    const body = await validateBody(req, revokeSchema).catch(() => ({ reason: undefined }));

    log.info('Revoking QR session', { sessionId, revokedBy: user.id });

    await revokeQrSession(sessionId, user.id, body.reason, req);

    log.info('QR session revoked', { sessionId });
    return ApiResponse.success({ revoked: true });
  },
});
