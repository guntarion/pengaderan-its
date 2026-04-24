/**
 * src/app/api/dashboard/[role]/route.ts
 * Dynamic dashboard payload endpoint for M13 multi-role dashboard.
 *
 * GET /api/dashboard/:role
 * - Auth: session (NextAuth) or Bearer LLM key
 * - Role guard: session.user.role must match requested role (or SUPERADMIN)
 * - Cache: Redis 5 minutes per user+role+cohort
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { ForbiddenError, NotFoundError } from '@/lib/api';
import { getCachedDashboardPayload } from '@/lib/dashboard/cache';
import { buildMabaDashboard } from '@/lib/dashboard/payload-builders/maba';
import { buildOCDashboard } from '@/lib/dashboard/payload-builders/oc';
import { buildKasuhDashboard } from '@/lib/dashboard/payload-builders/kasuh';
import { buildKPDashboard } from '@/lib/dashboard/payload-builders/kp';
import { buildBLMDashboard } from '@/lib/dashboard/payload-builders/blm';
import { buildPembinaDashboard } from '@/lib/dashboard/payload-builders/pembina';
import { buildSatgasDashboard } from '@/lib/dashboard/payload-builders/satgas';
import { buildSCDashboard } from '@/lib/dashboard/payload-builders/sc';
import { DASHBOARD_ROLE_MAP } from '@/lib/dashboard/drilldown';

type BuilderFn = (userId: string, cohortId: string, organizationId: string) => Promise<unknown>;

const PAYLOAD_BUILDERS: Record<string, BuilderFn> = {
  maba: buildMabaDashboard,
  oc: buildOCDashboard,
  kasuh: buildKasuhDashboard,
  kp: buildKPDashboard,
  blm: buildBLMDashboard,
  pembina: buildPembinaDashboard,
  satgas: buildSatgasDashboard,
  sc: buildSCDashboard,
};

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log }) => {
    const role = params?.role as string | undefined;

    if (!role || !PAYLOAD_BUILDERS[role]) {
      throw NotFoundError(`Dashboard role '${role ?? ''}' not found`);
    }

    // Role guard: user must be the matching role or SUPERADMIN
    const requiredRole = DASHBOARD_ROLE_MAP[role];
    const userRole = (user as { role?: string }).role;

    if (userRole !== 'SUPERADMIN' && userRole !== requiredRole) {
      throw ForbiddenError(
        `Role '${userRole ?? 'unknown'}' cannot access '${role}' dashboard`,
      );
    }

    // Resolve cohortId and organizationId from user
    const cohortId = (user as { cohortId?: string }).cohortId ?? '';
    const organizationId = (user as { organizationId?: string }).organizationId ?? '';

    if (!cohortId) {
      throw NotFoundError('User tidak tergabung dalam cohort aktif');
    }

    log.info('Dashboard payload requested', { role, userId: user.id, cohortId });

    const builder = PAYLOAD_BUILDERS[role];
    const payload = await getCachedDashboardPayload(
      role,
      user.id,
      cohortId,
      () => builder(user.id, cohortId, organizationId),
    );

    return ApiResponse.success(payload);
  },
});
