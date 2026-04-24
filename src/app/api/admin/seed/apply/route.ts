/**
 * src/app/api/admin/seed/apply/route.ts
 * POST /api/admin/seed/apply — SUPERADMIN only
 * Runs seed in apply mode and returns summary.
 * Rate limited: tracked via a simple in-memory timestamp (server instance scoped).
 */

import { createApiHandler, ApiResponse, RateLimitError } from '@/lib/api';
import { invalidateAll } from '@/lib/master-data/cache/invalidate';
import { createLogger } from '@/lib/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const log = createLogger('api:seed-apply');

// Simple per-server-instance rate limit: 1 apply per 5 minutes
let lastApplyAt: number | null = null;
const RATE_LIMIT_MS = 5 * 60 * 1000;

export const POST = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (_req, { user, log: ctxLog }) => {
    // Rate limit check
    const now = Date.now();
    if (lastApplyAt !== null && now - lastApplyAt < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - (now - lastApplyAt)) / 1000);
      throw RateLimitError(`Tunggu ${remaining} detik sebelum apply berikutnya`);
    }

    ctxLog.info('Running seed apply', { userId: user.id });
    lastApplyAt = now;

    const seedScript = path.join(process.cwd(), 'prisma/seed/master-data.ts');

    try {
      const { stdout, stderr } = await execAsync(
        `npx tsx "${seedScript}" --apply --json`,
        {
          cwd: process.cwd(),
          timeout: 120000,
          env: { ...process.env },
        },
      );

      if (stderr && !stdout) {
        log.warn('Seed apply stderr', { stderr });
      }

      // Invalidate all caches after successful apply
      await invalidateAll();

      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const report = JSON.parse(jsonMatch[0]);
        return ApiResponse.success({ success: true, report, raw: stdout.slice(0, 2000) });
      }

      return ApiResponse.success({ success: true, report: null, raw: stdout.slice(0, 2000) });
    } catch (err: unknown) {
      const error = err as { message?: string; stdout?: string; stderr?: string };
      log.error('Seed apply failed', { error });
      return ApiResponse.success({
        success: false,
        report: null,
        raw: error.stdout ?? error.message ?? 'Apply failed',
        error: error.stderr ?? error.message,
      });
    }
  },
});
