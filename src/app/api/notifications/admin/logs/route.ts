/**
 * src/app/api/notifications/admin/logs/route.ts
 * NAWASENA M15 — Admin Notification Logs API
 *
 * GET /api/notifications/admin/logs — list logs with filter + pagination
 * Roles: SC, SUPERADMIN
 *
 * PII minimization: we include userId but not sensitive content (no template payload).
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { z } from 'zod';

const logsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum([
    'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED',
    'COMPLAINED', 'SKIPPED_USER_OPTOUT', 'SKIPPED_NO_SUBSCRIPTION',
    'SKIPPED_BOUNCE_COOLDOWN', 'ESCALATED_INSTEAD_OF_SEND',
  ]).optional(),
  channel: z.enum(['PUSH', 'EMAIL', 'WHATSAPP', 'IN_APP']).optional(),
  category: z.enum(['CRITICAL', 'FORM_REMINDER', 'NORMAL', 'OPS']).optional(),
  templateKey: z.string().optional(),
  userId: z.string().optional(),
  ruleExecutionId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const query = validateQuery(req, logsQuerySchema);
    const { page: rawPage, limit: rawLimit, status, channel, category, templateKey, userId, ruleExecutionId, from, to } = query;
    const page = rawPage ?? 1;
    const limit = rawLimit ?? 20;

    const skip = (page - 1) * limit;

    const where = {
      organizationId: ctx.user!.organizationId,
      ...(status && { status }),
      ...(channel && { channel }),
      ...(category && { category }),
      ...(templateKey && { templateKey }),
      ...(userId && { userId }),
      ...(ruleExecutionId && { ruleExecutionId }),
      ...(from || to ? {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          templateKey: true,
          channel: true,
          category: true,
          status: true,
          providerMessageId: true,
          retryCount: true,
          criticalOverride: true,
          sentAt: true,
          deliveredAt: true,
          failedAt: true,
          createdAt: true,
          ruleExecutionId: true,
          ruleId: true,
          user: { select: { fullName: true, nrp: true } },
        },
      }),
      prisma.notificationLog.count({ where }),
    ]);

    return ApiResponse.paginated(logs, { page: page, limit: limit, total });
  },
});
