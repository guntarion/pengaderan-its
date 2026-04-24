/**
 * src/app/api/event-execution/instances/[id]/outputs/url-create/route.ts
 * NAWASENA M08 — Create a LINK/VIDEO/REPO output (no S3).
 *
 * POST /api/event-execution/instances/[id]/outputs/url-create
 *   - Body: { type, url, caption }
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { createUrlOutput } from '@/lib/event-execution/services/output.service';
import { createUrlOutputSchema } from '@/lib/event-execution/schemas';

export const POST = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;
    const body = await validateBody(req, createUrlOutputSchema);

    log.info('Creating URL output', { instanceId, type: body.type });

    const outputId = await createUrlOutput(instanceId, user.id, user.organizationId!, body);

    return ApiResponse.success({ outputId });
  },
});
