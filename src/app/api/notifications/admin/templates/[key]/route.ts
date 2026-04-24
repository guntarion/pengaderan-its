/**
 * src/app/api/notifications/admin/templates/[key]/route.ts
 * NAWASENA M15 — Template detail by key
 *
 * GET /api/notifications/admin/templates/[key]
 * Roles: SC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, NotFoundError } from '@/lib/api';

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { key } = ctx.params as { key: string };

    // Find org-specific version first, fallback to global
    const orgTemplate = await prisma.notificationTemplate.findFirst({
      where: {
        templateKey: key,
        organizationId: ctx.user!.organizationId,
      },
      include: {
        activeVersion: true,
        versions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            version: true,
            format: true,
            publishedAt: true,
            createdAt: true,
            createdBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    const globalTemplate = await prisma.notificationTemplate.findFirst({
      where: {
        templateKey: key,
        organizationId: null,
      },
      include: {
        activeVersion: true,
        versions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            version: true,
            format: true,
            publishedAt: true,
            createdAt: true,
            createdBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!orgTemplate && !globalTemplate) {
      throw NotFoundError(`Template with key '${key}'`);
    }

    return ApiResponse.success({
      orgTemplate: orgTemplate ?? null,
      globalTemplate: globalTemplate ?? null,
      effectiveTemplate: orgTemplate ?? globalTemplate,
    });
  },
});
