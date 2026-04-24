/**
 * src/app/api/event-execution/instances/[id]/outputs/[outputId]/finalize/route.ts
 * NAWASENA M08 — Finalize a file upload after S3 PUT completes.
 *
 * POST /api/event-execution/instances/[id]/outputs/[outputId]/finalize
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { finalizeFileUpload } from '@/lib/event-execution/services/output.service';

export const POST = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { id: instanceId, outputId } = params as { id: string; outputId: string };
    log.info('Finalizing output upload', { outputId, instanceId });

    await finalizeFileUpload(outputId, user.id, user.organizationId!);

    return ApiResponse.success({ finalized: true });
  },
});
