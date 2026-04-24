/**
 * src/app/api/event-execution/instances/[id]/outputs/[outputId]/route.ts
 * NAWASENA M08 — Delete an output upload.
 *
 * DELETE /api/event-execution/instances/[id]/outputs/[outputId]
 *   - Roles: OC, SC, SUPERADMIN (only uploader or SC/SUPERADMIN can delete)
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { deleteOutput } from '@/lib/event-execution/services/output.service';

export const DELETE = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { outputId } = params as { id: string; outputId: string };
    log.info('Deleting output', { outputId, userId: user.id });

    await deleteOutput(outputId, user.id, user.organizationId!, user.role);

    return ApiResponse.success({ deleted: true });
  },
});
