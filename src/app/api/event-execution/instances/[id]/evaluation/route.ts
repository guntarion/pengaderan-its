/**
 * src/app/api/event-execution/instances/[id]/evaluation/route.ts
 * NAWASENA M08 — Evaluation prefill + submit.
 *
 * GET /api/event-execution/instances/[id]/evaluation
 *   - Returns prefill data for evaluation form
 *   - Roles: OC, SC, SUPERADMIN
 *
 * POST /api/event-execution/instances/[id]/evaluation
 *   - Submit evaluation
 *   - 409 if already submitted
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { getPrefillData, submitEvaluation } from '@/lib/event-execution/services/evaluation.service';
import { submitEvaluationSchema } from '@/lib/event-execution/schemas';

export const GET = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;
    log.info('Fetching evaluation prefill', { instanceId });

    const prefill = await getPrefillData(instanceId, user.organizationId!);

    return ApiResponse.success(prefill);
  },
});

export const POST = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;
    const body = await validateBody(req, submitEvaluationSchema);

    log.info('Submitting evaluation', { instanceId, userId: user.id });

    const result = await submitEvaluation(instanceId, user.id, user.organizationId!, body);

    return ApiResponse.success(result);
  },
});
