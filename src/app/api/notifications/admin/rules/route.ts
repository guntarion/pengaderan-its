/**
 * src/app/api/notifications/admin/rules/route.ts
 * NAWASENA M15 — Admin Notification Rules API
 *
 * GET  /api/notifications/admin/rules — list all rules (global + org-specific)
 * POST /api/notifications/admin/rules — create a new org-specific rule
 *
 * Roles: SC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateQuery } from '@/lib/api';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  active: z.enum(['true', 'false']).optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  templateKey: z.string().min(1),
  cronExpression: z.string().min(1),
  timezone: z.string().default('Asia/Jakarta'),
  category: z.enum(['CRITICAL', 'FORM_REMINDER', 'NORMAL', 'OPS']),
  channels: z.array(z.enum(['PUSH', 'EMAIL', 'WHATSAPP', 'IN_APP'])).min(1),
  audienceResolverKey: z.string().min(1),
  audienceParams: z.record(z.unknown()).optional(),
  maxRemindersPerWeek: z.number().int().min(1).max(10).default(3),
  active: z.boolean().default(true),
  overridesRuleId: z.string().optional(),
});

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { page: rawPage, limit: rawLimit, active } = validateQuery(req, listQuerySchema);
    const page = rawPage ?? 1;
    const limit = rawLimit ?? 20;

    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { organizationId: ctx.user!.organizationId },
        { isGlobal: true, organizationId: null },
      ],
      ...(active !== undefined && { active: active === 'true' }),
    };

    const [rules, total] = await Promise.all([
      prisma.notificationRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isGlobal: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          description: true,
          templateKey: true,
          cronExpression: true,
          timezone: true,
          category: true,
          channels: true,
          audienceResolverKey: true,
          active: true,
          isGlobal: true,
          organizationId: true,
          overridesRuleId: true,
          lastExecutedAt: true,
          createdAt: true,
          updatedAt: true,
          createdBy: { select: { id: true, fullName: true } },
          _count: { select: { executions: true } },
        },
      }),
      prisma.notificationRule.count({ where }),
    ]);

    return ApiResponse.paginated(rules, { page: page, limit: limit, total });
  },
});

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const body = await validateBody(req, createRuleSchema);

    ctx.log.info('Creating notification rule', { name: body.name });

    const rule = await prisma.notificationRule.create({
      data: {
        ...body,
        organizationId: ctx.user!.organizationId,
        isGlobal: false,
        audienceParams: body.audienceParams as Prisma.InputJsonValue | undefined,
        createdById: ctx.user!.id,
      },
      select: {
        id: true,
        name: true,
        templateKey: true,
        cronExpression: true,
        category: true,
        active: true,
        createdAt: true,
      },
    });

    await auditLog.fromContext(
      ctx,
      {
        action: AUDIT_ACTIONS.NOTIFICATION_RULE_CREATE,
        resource: 'notification_rule',
        resourceId: rule.id,
        newValue: { name: body.name, templateKey: body.templateKey },
      },
      req,
    );

    ctx.log.info('Notification rule created', { ruleId: rule.id });

    return ApiResponse.success(rule, 201);
  },
});
