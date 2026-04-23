// src/app/api/users/route.ts
import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users — List all users (admin only).
 */
export const GET = createApiHandler({
  roles: ['admin'],
  handler: async () => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        namaPanggilan: true,
        nomerHandphone: true,
        gender: true,
        tanggalLahir: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ApiResponse.success(users);
  },
});
