/**
 * src/app/api/passport/progress/route.ts
 * NAWASENA M05 — GET: Cached progress for current user.
 */

import {
  createApiHandler,
  ApiResponse,
} from '@/lib/api';
import { getProgress } from '@/lib/passport/progress.service';

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    log.debug('Fetching passport progress', { userId: user.id });

    const progress = await getProgress(user.id);

    return ApiResponse.success(progress);
  },
});
