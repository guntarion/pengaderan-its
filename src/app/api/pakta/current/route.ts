/**
 * GET /api/pakta/current?type=PAKTA_PANITIA[&versionId=...]
 * Fetch the current published pakta version for the user's organization.
 *
 * Returns full document data for the signing flow.
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { BadRequestError, NotFoundError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';

const VALID_TYPES = ['PAKTA_PANITIA', 'SOCIAL_CONTRACT_MABA', 'PAKTA_PENGADER_2027'] as const;

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const versionId = searchParams.get('versionId');

    if (!type || !VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
      throw BadRequestError(
        `Parameter type tidak valid. Pilih dari: ${VALID_TYPES.join(', ')}`
      );
    }

    const orgId = user.organizationId ?? '';
    if (!orgId) throw BadRequestError('organizationId tidak ditemukan di sesi');

    log.info('Fetching current pakta version', { orgId, type, versionId });

    // If versionId is provided, fetch that specific version
    const where = versionId
      ? { id: versionId, organizationId: orgId }
      : { organizationId: orgId, type: type as typeof VALID_TYPES[number], status: 'PUBLISHED' as const };

    const version = await prisma.paktaVersion.findFirst({
      where,
      select: {
        id: true,
        type: true,
        versionNumber: true,
        title: true,
        contentMarkdown: true,
        quizQuestions: true,
        passingScore: true,
        effectiveFrom: true,
        status: true,
      },
    });

    if (!version) {
      throw NotFoundError('PaktaVersion');
    }

    if (version.status !== 'PUBLISHED') {
      throw BadRequestError('Dokumen pakta belum diterbitkan');
    }

    return ApiResponse.success(version);
  },
});
