/**
 * src/app/api/admin/passport/qr-session/route.ts
 * NAWASENA M05 — POST: Create a new QR session (SC/SUPERADMIN only).
 */

import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateBody,
  NotFoundError,
} from '@/lib/api';
import { createQrSession } from '@/lib/passport/qr-session.service';
import { z } from 'zod';

const createSessionSchema = z.object({
  itemId: z.string().min(1),
  eventName: z.string().min(1).max(200),
  eventLocation: z.string().max(200).optional(),
  ttlHours: z.number().int().min(1).max(24).optional().default(4),
  maxScans: z.number().int().positive().optional(),
  cohortId: z.string().min(1),
});

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, createSessionSchema);

    // Validate item exists
    const item = await prisma.passportItem.findUnique({ where: { id: body.itemId } });
    if (!item) throw NotFoundError('PassportItem');

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });
    if (!fullUser) throw NotFoundError('User');

    log.info('Creating QR session', {
      itemId: body.itemId,
      eventName: body.eventName,
      ttlHours: body.ttlHours,
    });

    const result = await createQrSession({
      itemId: body.itemId,
      organizationId: fullUser.organizationId,
      cohortId: body.cohortId,
      createdByUserId: user.id,
      eventName: body.eventName,
      eventLocation: body.eventLocation,
      ttlHours: body.ttlHours,
      maxScans: body.maxScans,
      request: req,
    });

    log.info('QR session created', { sessionId: result.sessionId });
    return ApiResponse.success(result, 201);
  },
});

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });
    if (!fullUser) throw NotFoundError('User');

    const sessions = await prisma.passportQrSession.findMany({
      where: {
        organizationId: fullUser.organizationId,
        status: 'ACTIVE',
      },
      include: {
        item: { select: { id: true, description: true, dimensi: true } },
        creator: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(sessions);
  },
});
