/**
 * src/app/api/admin/master/taksonomi/[key]/route.ts
 * PATCH /api/admin/master/taksonomi/[key] — SUPERADMIN only
 * Updates bilingual labels for a TaxonomyMeta entry.
 */

import { createApiHandler, ApiResponse, validateBody, NotFoundError } from '@/lib/api';
import { updateTaxonomyMeta } from '@/lib/master-data/services/taxonomy.service';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';
import { z } from 'zod';

const updateTaxonomySchema = z.object({
  labelId: z.string().min(1).max(200).optional(),
  labelEn: z.string().min(1).max(200).optional(),
  deskripsi: z.string().max(2000).optional(),
});

export const PATCH = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (req, ctx) => {
    const { params, user, log } = ctx;
    const key = params.key;

    if (!key) throw NotFoundError('TaxonomyMeta');

    const data = await validateBody(req, updateTaxonomySchema);

    log.info('Updating taxonomy meta', { key });

    const updated = await updateTaxonomyMeta(key, data, user.id);
    if (!updated) throw NotFoundError('TaxonomyMeta');

    await auditLog.fromContext(ctx, {
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'taxonomy_meta',
      resourceId: key,
      newValue: data,
    }, req);

    log.info('Taxonomy meta updated', { key });
    return ApiResponse.success(updated);
  },
});
