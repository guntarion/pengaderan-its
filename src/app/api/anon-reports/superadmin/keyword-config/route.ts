/**
 * src/app/api/anon-reports/superadmin/keyword-config/route.ts
 *
 * GET  /api/anon-reports/superadmin/keyword-config — List all config entries
 * PATCH /api/anon-reports/superadmin/keyword-config — Update a config entry
 *
 * SUPERADMIN only. Uses M01 auditLog.record for meta-action auditing.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { setBypassRls } from '@/lib/anon-report/rls-helpers';
import { keywordConfigSchema } from '@/lib/anon-report/schemas';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';

export const GET = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (_req, { user, log }) => {
    log.info('Fetching keyword config', { role: user.role });

    const configs = await prisma.$transaction(async (tx) => {
      await setBypassRls(tx);
      return tx.anonReportConfig.findMany({
        orderBy: { key: 'asc' },
      });
    });

    return ApiResponse.success(configs);
  },
});

export const PATCH = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, keywordConfigSchema);

    log.info('Updating keyword config', { key: body.key, role: user.role });

    const existing = await prisma.$transaction(async (tx) => {
      await setBypassRls(tx);
      return tx.anonReportConfig.findUnique({ where: { key: body.key } });
    });

    const updated = await prisma.$transaction(async (tx) => {
      await setBypassRls(tx);

      return tx.anonReportConfig.upsert({
        where: { key: body.key },
        create: {
          id: `config-${body.key}`,
          key: body.key,
          value: body.value,
          updatedById: user.id,
        },
        update: {
          value: body.value,
          updatedById: user.id,
        },
      });
    });

    // Audit via M01 generic audit log
    await auditLog.record({
      userId: user.id,
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'anon_report_config',
      resourceId: body.key,
      oldValue: existing ? (existing.value as Record<string, unknown>) : null,
      newValue: body.value as unknown as Record<string, unknown>,
    });

    return ApiResponse.success(updated);
  },
});
