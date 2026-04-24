/**
 * src/app/api/notifications/admin/rules/[id]/preview-audience/route.ts
 * NAWASENA M15 — Dry-run audience preview for a notification rule.
 *
 * POST /api/notifications/admin/rules/[id]/preview-audience
 * Roles: SC, SUPERADMIN
 *
 * Returns the list of users who would receive this rule's notification
 * if it were fired now, without actually sending anything.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, NotFoundError } from '@/lib/api';
import { resolveAudience } from '@/lib/notifications/audience/resolver';

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = ctx.params as { id: string };

    ctx.log.info('Dry-run audience preview', { ruleId: id });

    const rule = await prisma.notificationRule.findFirst({
      where: {
        id,
        OR: [
          { organizationId: ctx.user!.organizationId },
          { isGlobal: true },
        ],
      },
      select: {
        audienceResolverKey: true,
        audienceParams: true,
        name: true,
      },
    });

    if (!rule) throw NotFoundError('Notification rule');

    const audience = await resolveAudience(
      rule.audienceResolverKey,
      ctx.user!.organizationId!,
      rule.audienceParams as Record<string, unknown> | null,
    );

    ctx.log.info('Audience preview complete', {
      ruleId: id,
      count: audience.length,
    });

    return ApiResponse.success({
      count: audience.length,
      users: audience.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email ? `${u.email.substring(0, 3)}***` : undefined, // PII minimization
      })),
    });
  },
});
