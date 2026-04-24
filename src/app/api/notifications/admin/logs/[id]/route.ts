/**
 * src/app/api/notifications/admin/logs/[id]/route.ts
 * NAWASENA M15 — Notification Log Detail
 *
 * GET /api/notifications/admin/logs/[id]
 * Roles: SC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, NotFoundError } from '@/lib/api';

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = ctx.params as { id: string };

    const logEntry = await prisma.notificationLog.findFirst({
      where: {
        id,
        organizationId: ctx.user!.organizationId,
      },
      include: {
        user: { select: { id: true, fullName: true, nrp: true, role: true } },
        templateVersion: { select: { version: true, format: true } },
        rule: { select: { id: true, name: true, cronExpression: true } },
        ruleExecution: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            triggeredBy: true,
            usersTargeted: true,
            usersSent: true,
            usersFailed: true,
          },
        },
      },
    });

    if (!logEntry) throw NotFoundError('Notification log');

    return ApiResponse.success(logEntry);
  },
});
