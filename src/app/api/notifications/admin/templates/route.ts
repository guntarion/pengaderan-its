/**
 * src/app/api/notifications/admin/templates/route.ts
 * NAWASENA M15 — Admin Notification Templates API
 *
 * GET /api/notifications/admin/templates — list all templates
 *
 * Roles: SC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { z } from 'zod';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.enum(['CRITICAL', 'FORM_REMINDER', 'NORMAL', 'OPS']).optional(),
});

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { page: rawPage, limit: rawLimit, category } = validateQuery(req, listQuerySchema);
    const page = rawPage ?? 1;
    const limit = rawLimit ?? 20;

    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { organizationId: ctx.user!.organizationId },
        { organizationId: null }, // global templates
      ],
      ...(category && { category }),
    };

    const [templates, total] = await Promise.all([
      prisma.notificationTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ organizationId: 'asc' }, { templateKey: 'asc' }],
        select: {
          id: true,
          templateKey: true,
          description: true,
          category: true,
          organizationId: true,
          supportedChannels: true,
          activeVersionId: true,
          createdAt: true,
          updatedAt: true,
          activeVersion: {
            select: {
              id: true,
              version: true,
              publishedAt: true,
            },
          },
          _count: { select: { versions: true } },
        },
      }),
      prisma.notificationTemplate.count({ where }),
    ]);

    return ApiResponse.paginated(templates, { page: page, limit: limit, total });
  },
});
