/**
 * GET /api/admin/pakta/versions/[id]/signers
 * List signers for a pakta version.
 * Roles: SC, SUPERADMIN, PEMBINA, BLM
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN', 'PEMBINA', 'BLM'],
  handler: async (req, { user, params, log }) => {
    const { id: versionId } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

    log.info('Fetching pakta signers', { versionId });

    const version = await prisma.paktaVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        organizationId: true,
        type: true,
        title: true,
        versionNumber: true,
        status: true,
      },
    });

    if (!version) throw NotFoundError('PaktaVersion');

    // Org scoping
    if (user.role !== 'SUPERADMIN' && version.organizationId !== user.organizationId) {
      throw ForbiddenError('Tidak dapat mengakses pakta dari organisasi lain');
    }

    // For DIGITAL pakta (organizationId IS NULL), signatures always have the signer's org
    // So we filter by versionId only (RLS handles org isolation for per-org pakta)
    const where = {
      paktaVersionId: versionId,
      ...(version.organizationId !== null ? { organizationId: version.organizationId } : {}),
    };

    const [signatures, total] = await Promise.all([
      prisma.paktaSignature.findMany({
        where,
        orderBy: { signedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          status: true,
          signedAt: true,
          quizScore: true,
          user: { select: { fullName: true, email: true, nrp: true, role: true } },
        },
      }),
      prisma.paktaSignature.count({ where }),
    ]);

    return ApiResponse.paginated(signatures, { page, limit, total });
  },
});
