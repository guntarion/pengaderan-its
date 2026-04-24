/**
 * src/app/api/event-execution/instances/[id]/qr/route.ts
 * NAWASENA M08 — QR session management for attendance.
 *
 * POST /api/event-execution/instances/[id]/qr
 *   - Create a new active QR session for the instance
 *   - Returns session metadata + PNG as base64 for display
 *   - Roles: OC, SC, SUPERADMIN
 *
 * GET /api/event-execution/instances/[id]/qr
 *   - Get current active QR session PNG
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { createQRSession, generateQRPng } from '@/lib/event-execution/services/qr.service';
import { createQRSessionSchema } from '@/lib/event-execution/schemas';

export const POST = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;

    const body = await validateBody(req, createQRSessionSchema.omit({ instanceId: true }));

    log.info('Creating QR session', { instanceId, userId: user.id });

    const session = await createQRSession(
      { instanceId, ttlHours: body.ttlHours ?? 2 },
      user.id,
      user.organizationId!,
    );

    // Generate PNG and return as base64
    const pngBuffer = await generateQRPng(session.id, user.organizationId!);
    const pngBase64 = pngBuffer.toString('base64');

    return ApiResponse.success({
      session: {
        id: session.id,
        shortCode: session.shortCode,
        expiresAt: session.expiresAt,
        status: session.status,
        qrUrl: session.qrUrl,
      },
      qrPngBase64: pngBase64,
    });
  },
});

export const GET = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;
    log.info('Fetching QR PNG', { instanceId });

    // Find active session for this instance
    const { prisma } = await import('@/utils/prisma');
    const session = await prisma.kegiatanQRSession.findFirst({
      where: {
        instanceId,
        organizationId: user.organizationId!,
        status: 'ACTIVE',
      },
      select: { id: true, shortCode: true, expiresAt: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      return ApiResponse.success(null);
    }

    const pngBuffer = await generateQRPng(session.id, user.organizationId!);
    const pngBase64 = pngBuffer.toString('base64');

    return ApiResponse.success({
      session: {
        id: session.id,
        shortCode: session.shortCode,
        expiresAt: session.expiresAt,
        status: session.status,
      },
      qrPngBase64: pngBase64,
    });
  },
});
