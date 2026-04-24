/**
 * src/app/api/notifications/admin/rules/[id]/route.ts
 * NAWASENA M15 — Admin Notification Rule CRUD
 *
 * GET    /api/notifications/admin/rules/[id]
 * PUT    /api/notifications/admin/rules/[id]
 * DELETE /api/notifications/admin/rules/[id]
 *
 * Roles: SC, SUPERADMIN
 * Global rules (isGlobal=true) cannot be deleted by SC — only by SUPERADMIN.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, NotFoundError, ForbiddenError } from '@/lib/api';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  cronExpression: z.string().min(1).optional(),
  timezone: z.string().optional(),
  channels: z.array(z.enum(['PUSH', 'EMAIL', 'WHATSAPP', 'IN_APP'])).min(1).optional(),
  audienceParams: z.record(z.unknown()).optional(),
  maxRemindersPerWeek: z.number().int().min(1).max(10).optional(),
  active: z.boolean().optional(),
});

async function findRule(id: string, organizationId: string | undefined) {
  const rule = await prisma.notificationRule.findFirst({
    where: {
      id,
      OR: [
        { organizationId: organizationId },
        { isGlobal: true },
      ],
    },
  });
  return rule;
}

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = ctx.params as { id: string };

    const rule = await prisma.notificationRule.findFirst({
      where: {
        id,
        OR: [
          { organizationId: ctx.user!.organizationId },
          { isGlobal: true },
        ],
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            usersTargeted: true,
            usersSent: true,
            usersFailed: true,
            triggeredBy: true,
          },
        },
        _count: { select: { executions: true } },
      },
    });

    if (!rule) throw NotFoundError('Notification rule');

    return ApiResponse.success(rule);
  },
});

export const PUT = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = ctx.params as { id: string };
    const body = await validateBody(req, updateRuleSchema);

    const existing = await findRule(id, ctx.user!.organizationId);
    if (!existing) throw NotFoundError('Notification rule');

    // Only SUPERADMIN can edit global rules
    if (existing.isGlobal && ctx.user!.role !== 'SUPERADMIN') {
      throw ForbiddenError('Only SUPERADMIN can modify global rules. Create an org-specific override instead.');
    }

    ctx.log.info('Updating notification rule', { ruleId: id });

    const updated = await prisma.notificationRule.update({
      where: { id },
      data: {
        ...body,
        audienceParams: body.audienceParams as Prisma.InputJsonValue | undefined,
      },
      select: { id: true, name: true, active: true, updatedAt: true },
    });

    await auditLog.fromContext(
      ctx,
      {
        action: AUDIT_ACTIONS.NOTIFICATION_RULE_UPDATE,
        resource: 'notification_rule',
        resourceId: id,
        oldValue: { active: existing.active, cronExpression: existing.cronExpression },
        newValue: body,
      },
      req,
    );

    return ApiResponse.success(updated);
  },
});

export const DELETE = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = ctx.params as { id: string };

    const existing = await findRule(id, ctx.user!.organizationId);
    if (!existing) throw NotFoundError('Notification rule');

    // Only SUPERADMIN can delete global rules
    if (existing.isGlobal && ctx.user!.role !== 'SUPERADMIN') {
      throw ForbiddenError('Only SUPERADMIN can delete global rules.');
    }

    // Prevent deleting rules with recent executions (last 7 days)
    const recentExecution = await prisma.notificationRuleExecution.findFirst({
      where: {
        ruleId: id,
        startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (recentExecution) {
      // Soft delete — just deactivate
      await prisma.notificationRule.update({
        where: { id },
        data: { active: false },
      });
      ctx.log.info('Notification rule deactivated (has recent executions)', { ruleId: id });
    } else {
      await prisma.notificationRule.delete({ where: { id } });
      ctx.log.info('Notification rule deleted', { ruleId: id });
    }

    await auditLog.fromContext(
      ctx,
      {
        action: AUDIT_ACTIONS.NOTIFICATION_RULE_DELETE,
        resource: 'notification_rule',
        resourceId: id,
        oldValue: { name: existing.name, templateKey: existing.templateKey },
      },
      req,
    );

    return ApiResponse.success({ deleted: true, softDelete: !!recentExecution });
  },
});
