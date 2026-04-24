/**
 * src/app/api/users/verifiers/route.ts
 * NAWASENA M05 — GET: List users who can act as passport verifiers (KP, KASUH, DOSEN_WALI, SC, SUPERADMIN).
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';

const VERIFIER_ROLES = ['KP', 'KASUH', 'DOSEN_WALI', 'SC', 'SUPERADMIN'];

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { log }) => {
    log.info('Fetching verifier list for passport signature');

    const verifiers = await prisma.user.findMany({
      where: {
        role: { in: VERIFIER_ROLES as never[] },
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      select: {
        id: true,
        fullName: true,
        role: true,
      },
    });

    return ApiResponse.success(verifiers);
  },
});
