/**
 * src/app/api/admin/event-execution/evaluations/[id]/route.ts
 * NAWASENA M08 — SC-only: delete an evaluation.
 *
 * DELETE /api/admin/event-execution/evaluations/[id]
 *   - Body: { reason }
 *   - Roles: SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { deleteEvaluationBySC } from '@/lib/event-execution/services/evaluation.service';
import { z } from 'zod';

const deleteSchema = z.object({
  reason: z.string().min(10, 'Alasan wajib diisi (min 10 karakter)'),
});

export const DELETE = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const evaluationId = (params as { id: string }).id;
    const body = await validateBody(req, deleteSchema);

    log.info('SC deleting evaluation', { evaluationId, userId: user.id });

    await deleteEvaluationBySC(evaluationId, user.id, user.organizationId!, body.reason);

    return ApiResponse.success({ deleted: true });
  },
});
