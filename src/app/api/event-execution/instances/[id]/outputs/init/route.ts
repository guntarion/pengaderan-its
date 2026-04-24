/**
 * src/app/api/event-execution/instances/[id]/outputs/init/route.ts
 * NAWASENA M08 — Initiate a file upload (get presigned S3 URL).
 *
 * POST /api/event-execution/instances/[id]/outputs/init
 *   - Body: { filename, mimeType, sizeBytes, caption }
 *   - Returns: { outputId, uploadUrl, s3Key, expiresAt }
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { initFileUpload } from '@/lib/event-execution/services/output.service';
import { initFileUploadSchema } from '@/lib/event-execution/schemas';

export const POST = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;
    const body = await validateBody(req, initFileUploadSchema);

    log.info('Initiating output file upload', { instanceId });

    const result = await initFileUpload(instanceId, user.id, user.organizationId!, body);

    return ApiResponse.success(result);
  },
});
