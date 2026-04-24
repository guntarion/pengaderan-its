/**
 * src/app/api/notifications/admin/logs/export/route.ts
 * NAWASENA M15 — Notification Logs CSV Export
 *
 * GET /api/notifications/admin/logs/export?from=...&to=...
 * Roles: SC, SUPERADMIN
 *
 * Returns logs as CSV. Max 5000 rows per export. PII-minimized.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, validateQuery } from '@/lib/api';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const exportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
  channel: z.string().optional(),
  templateKey: z.string().optional(),
});

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { from, to, status, channel, templateKey } = validateQuery(req, exportQuerySchema);

    ctx.log.info('Exporting notification logs', { from, to, status, channel, templateKey });

    const orgId = ctx.user!.organizationId;
    const where: Prisma.NotificationLogWhereInput = {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(templateKey ? { templateKey } : {}),
      ...(channel ? { channel: channel as Prisma.EnumChannelTypeFilter } : {}),
      ...(status ? { status: status as Prisma.EnumLogStatusFilter } : {}),
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    };

    const logs = await prisma.notificationLog.findMany({
      where,
      take: 5000,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, nrp: true, role: true } },
      },
    });

    // Build CSV
    const headers = [
      'id', 'templateKey', 'channel', 'category', 'status',
      'userFullName', 'userNrp', 'userRole',
      'retryCount', 'criticalOverride',
      'sentAt', 'deliveredAt', 'failedAt', 'createdAt',
    ];

    const rows = logs.map((l) => [
      l.id,
      l.templateKey,
      l.channel,
      l.category,
      l.status,
      l.user.fullName,
      l.user.nrp ?? '',
      l.user.role,
      l.retryCount,
      l.criticalOverride,
      l.sentAt?.toISOString() ?? '',
      l.deliveredAt?.toISOString() ?? '',
      l.failedAt?.toISOString() ?? '',
      l.createdAt.toISOString(),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    const filename = `notification-logs-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  },
});
