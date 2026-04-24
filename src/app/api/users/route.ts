// src/app/api/users/route.ts
// NAWASENA: User list endpoint (basic version).
// Full admin user management in Phase 6: /api/admin/users

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users — List users in the requester's organization (SC/SUPERADMIN only).
 */
export const GET = createApiHandler({
  roles: [UserRole.SC, UserRole.SUPERADMIN],
  handler: async (_req, { user }) => {
    // For now, return a basic list. Phase 6 will add pagination + filters.
    const organizationId = (user as { organizationId?: string }).organizationId;

    const users = await prisma.user.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        email: true,
        image: true,
        role: true,
        status: true,
        currentCohortId: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 100, // Temporary limit; Phase 6 adds pagination
    });

    return ApiResponse.success(users);
  },
});
