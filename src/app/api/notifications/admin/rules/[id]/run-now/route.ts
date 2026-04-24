/**
 * src/app/api/notifications/admin/rules/[id]/run-now/route.ts
 * NAWASENA M15 — Manual rule trigger endpoint.
 *
 * POST /api/notifications/admin/rules/[id]/run-now
 * Roles: SC, SUPERADMIN
 *
 * Allows admins to manually trigger a notification rule execution
 * without waiting for the cron schedule. Records an audit log entry.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, NotFoundError } from '@/lib/api';
import { executeRule } from '@/lib/notifications/execute-rule';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const runNowSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = ctx.params as { id: string };
    const { reason } = await validateBody(req, runNowSchema);

    ctx.log.info('Manual rule trigger requested', { ruleId: id, reason });

    // Fetch rule to verify it exists and belongs to this org (or is global)
    const rule = await prisma.notificationRule.findFirst({
      where: {
        id,
        OR: [
          { organizationId: ctx.user!.organizationId },
          { isGlobal: true, organizationId: null },
        ],
      },
      select: { id: true, name: true, active: true },
    });

    if (!rule) {
      throw NotFoundError('Notification rule');
    }

    const triggerSource = `MANUAL:${ctx.user!.id}`;
    const executionToken = `manual-${ctx.user!.id}-${id}-${randomUUID()}`;

    const result = await executeRule({
      ruleId: id,
      organizationId: ctx.user!.organizationId!,
      triggerSource,
      executionToken,
    });

    // Audit log
    await auditLog.fromContext(
      ctx,
      {
        action: AUDIT_ACTIONS.CRON_MANUAL_TRIGGER,
        resource: 'notification_rule',
        resourceId: id,
        metadata: {
          ruleName: rule.name,
          reason: reason ?? null,
          executionId: result.executionId,
          usersTargeted: result.usersTargeted,
          usersSent: result.usersSent,
        },
      },
      req,
    );

    ctx.log.info('Manual rule trigger complete', {
      ruleId: id,
      executionId: result.executionId,
      status: result.status,
    });

    return ApiResponse.success({
      executionId: result.executionId,
      status: result.status,
      usersTargeted: result.usersTargeted,
      usersSent: result.usersSent,
      usersFailed: result.usersFailed,
      usersEscalated: result.usersEscalated,
    });
  },
});
