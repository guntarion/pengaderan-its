/**
 * src/app/api/dashboard/alerts/[id]/dismiss/route.ts
 * POST /api/dashboard/alerts/:id/dismiss
 * Mark a RedFlagAlert as DISMISSED by the current user.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';
import { NotFoundError, ForbiddenError } from '@/lib/api';
import { invalidateAlertCache } from '@/lib/dashboard/cache';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';

export const POST = createApiHandler({
  auth: true,
  handler: async (req, ctx) => {
    const { user, params, log } = ctx;
    const id = params?.id as string | undefined;
    if (!id) throw NotFoundError('Alert ID diperlukan');

    const alert = await prisma.redFlagAlert.findUnique({
      where: { id },
      select: { id: true, cohortId: true, status: true, targetRoles: true },
    });

    if (!alert) throw NotFoundError(`Alert ${id} tidak ditemukan`);

    if (alert.status === 'DISMISSED' || alert.status === 'RESOLVED') {
      throw ForbiddenError(`Alert sudah ${alert.status}`);
    }

    // Check role access
    const userRole = (user as { role?: string }).role;
    const isAuthorized =
      userRole === 'SUPERADMIN' ||
      (userRole && alert.targetRoles.includes(userRole as never));

    if (!isAuthorized) {
      throw ForbiddenError('Anda tidak berwenang menutup alert ini');
    }

    const updated = await prisma.redFlagAlert.update({
      where: { id },
      data: {
        status: 'DISMISSED',
        dismissedById: user.id,
        dismissedAt: new Date(),
      },
    });

    // Invalidate alert cache for cohort
    await invalidateAlertCache(alert.cohortId);

    await auditLog.fromContext(
      ctx,
      {
        action: AUDIT_ACTIONS.UPDATE,
        resource: 'red_flag_alert',
        resourceId: id,
        newValue: { status: 'DISMISSED' },
      },
      req,
    );

    log.info('Alert dismissed', { alertId: id, userId: user.id });

    return ApiResponse.success({ id: updated.id, status: updated.status });
  },
});
