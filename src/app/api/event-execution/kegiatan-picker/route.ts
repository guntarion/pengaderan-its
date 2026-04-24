/**
 * src/app/api/event-execution/kegiatan-picker/route.ts
 * NAWASENA M08 — Kegiatan picker for instance creation wizard.
 *
 * GET /api/event-execution/kegiatan-picker
 *   - Authenticated (any role with OC/SC/SUPERADMIN)
 *   - Returns searchable list of active Kegiatan for current org
 */

import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { kegiatanPickerQuerySchema } from '@/lib/event-execution/schemas';
import { getKegiatanPickerOptions } from '@/lib/event-execution/services/instance.service';
import { prisma } from '@/utils/prisma';

export const GET = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const rawFilters = validateQuery(req, kegiatanPickerQuerySchema);
    const filters = {
      ...rawFilters,
      page: rawFilters.page ?? 1,
      limit: rawFilters.limit ?? 50,
    };

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });

    const orgId = user.organizationId ?? userData?.organizationId ?? '';
    const items = await getKegiatanPickerOptions(orgId, filters);

    log.info('Kegiatan picker fetched', { count: items.length, orgId });
    return ApiResponse.success(items);
  },
});
