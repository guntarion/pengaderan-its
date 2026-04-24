/**
 * src/app/api/admin/master/kegiatan/[id]/route.ts
 * PATCH /api/admin/master/kegiatan/[id]
 * Toggle isActive or update displayOrder.
 * SC can manage org-specific kegiatan. SUPERADMIN can manage global.
 */

import { createApiHandler, ApiResponse, validateBody, NotFoundError, ForbiddenError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { toggleKegiatanActive } from '@/lib/master-data/services/kegiatan.service';
import { invalidateCatalog, invalidateDetail } from '@/lib/master-data/cache/invalidate';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';
import { z } from 'zod';

const patchKegiatanSchema = z.object({
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const PATCH = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { params, user, log } = ctx;
    const id = params.id;

    if (!id) throw NotFoundError('Kegiatan');

    const data = await validateBody(req, patchKegiatanSchema);

    // Load existing kegiatan
    const existing = await prisma.kegiatan.findUnique({
      where: { id },
      select: { id: true, isActive: true, isGlobal: true, organizationId: true, displayOrder: true },
    });
    if (!existing) throw NotFoundError('Kegiatan');

    // SC cannot modify global kegiatan — only SUPERADMIN can
    if (existing.isGlobal && user.role !== 'SUPERADMIN') {
      log.warn('SC attempted to edit global kegiatan', { id, userId: user.id });
      throw ForbiddenError();
    }

    log.info('Patching kegiatan', { id, data, userId: user.id });

    // Apply changes
    if (data.isActive !== undefined) {
      await toggleKegiatanActive(id, data.isActive, user.id);
    }

    if (data.displayOrder !== undefined) {
      await prisma.kegiatan.update({
        where: { id },
        data: { displayOrder: data.displayOrder },
      });
    }

    // Invalidate cache
    await invalidateDetail(id);
    await invalidateCatalog();

    // Audit log
    await auditLog.fromContext(ctx, {
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'kegiatan',
      resourceId: id,
      oldValue: { isActive: existing.isActive, displayOrder: existing.displayOrder },
      newValue: data,
    }, req);

    const updated = await prisma.kegiatan.findUnique({
      where: { id },
      select: { id: true, isActive: true, displayOrder: true, isGlobal: true },
    });

    return ApiResponse.success(updated);
  },
});
