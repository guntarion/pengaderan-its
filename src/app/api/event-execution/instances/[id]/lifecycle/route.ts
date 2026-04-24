/**
 * src/app/api/event-execution/instances/[id]/lifecycle/route.ts
 * NAWASENA M08 — Instance lifecycle transitions.
 *
 * POST /api/event-execution/instances/[id]/lifecycle
 *   - Body: { action: 'start'|'finish'|'cancel'|'reschedule', version, reason?, newScheduledAt? }
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { transition } from '@/lib/event-execution/services/lifecycle.service';
import { rescheduleInstance } from '@/lib/event-execution/services/reschedule.service';
import { lifecycleSchema } from '@/lib/event-execution/schemas';

export const POST = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;
    const body = await validateBody(req, lifecycleSchema);

    log.info('Lifecycle action', { instanceId, action: body.action, userId: user.id });

    if (body.action === 'reschedule') {
      if (!body.newScheduledAt) {
        throw new Error('VALIDATION: newScheduledAt wajib diisi untuk reschedule.');
      }
      await rescheduleInstance(
        instanceId,
        body.newScheduledAt,
        user.id,
        user.organizationId!,
        body.reason,
      );
      return ApiResponse.success({ action: 'reschedule', success: true });
    }

    if (body.action === 'cancel' && !body.reason) {
      throw new Error('VALIDATION: Alasan pembatalan wajib diisi (min 20 karakter).');
    }

    const result = await transition(instanceId, body, user.id, user.organizationId!);

    return ApiResponse.success(result);
  },
});
