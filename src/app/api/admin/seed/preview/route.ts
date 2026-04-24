/**
 * src/app/api/admin/seed/preview/route.ts
 * POST /api/admin/seed/preview — SUPERADMIN only
 * Runs seed in preview/dry-run mode and returns diff report.
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const log = createLogger('api:seed-preview');

export const POST = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (_req, { log: ctxLog }) => {
    ctxLog.info('Running seed preview');

    const seedScript = path.join(process.cwd(), 'prisma/seed/master-data.ts');

    try {
      const { stdout, stderr } = await execAsync(
        `npx tsx "${seedScript}" --preview --json`,
        {
          cwd: process.cwd(),
          timeout: 60000,
          env: { ...process.env },
        },
      );

      if (stderr && !stdout) {
        log.warn('Seed preview stderr', { stderr });
      }

      // Try to extract JSON from stdout
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const report = JSON.parse(jsonMatch[0]);
        return ApiResponse.success({ report, raw: stdout.slice(0, 2000) });
      }

      return ApiResponse.success({ report: null, raw: stdout.slice(0, 2000) });
    } catch (err: unknown) {
      const error = err as { message?: string; stdout?: string; stderr?: string };
      log.error('Seed preview failed', { error });
      return ApiResponse.success({
        report: null,
        raw: error.stdout ?? error.message ?? 'Preview failed',
        error: error.stderr ?? error.message,
      });
    }
  },
});
