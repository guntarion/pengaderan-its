/**
 * GET /api/pakta/current?type=PAKTA_PANITIA[&versionId=...]
 * Fetch the current published pakta version for the user's context.
 *
 * Dual-scope behavior (RV-B):
 *   SOCIAL_CONTRACT_MABA → query global (organizationId IS NULL)
 *   PAKTA_PANITIA        → query per-org (organizationId = user's org)
 *   PAKTA_PENGADER_2027  → query per-org (organizationId = user's org)
 *
 * Returns full document data for the signing flow.
 */

import { createApiHandler, ApiResponse, BadRequestError, NotFoundError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { getActivePaktaByTypeForUser } from '@/services/pakta.service';
import type { PaktaType } from '@prisma/client';

const VALID_TYPES = ['PAKTA_PANITIA', 'SOCIAL_CONTRACT_MABA', 'PAKTA_PENGADER_2027'] as const;

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const versionId = searchParams.get('versionId');

    if (!type || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      throw BadRequestError(
        `Parameter type tidak valid. Pilih dari: ${VALID_TYPES.join(', ')}`,
      );
    }

    const orgId = user.organizationId ?? '';
    if (!orgId) throw BadRequestError('organizationId tidak ditemukan di sesi');

    log.info('Fetching current pakta version', { orgId, type, versionId });

    // If a specific versionId is requested, fetch directly
    if (versionId) {
      const paktaType = type as PaktaType;

      // Verify scope: DIGITAL is global, ETIK must belong to user's org
      const whereOrgId =
        paktaType === 'SOCIAL_CONTRACT_MABA' ? undefined : orgId;

      const version = await prisma.paktaVersion.findFirst({
        where: {
          id: versionId,
          ...(whereOrgId !== undefined && { organizationId: whereOrgId }),
        },
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
          organizationId: true,
        },
      });

      if (!version) throw NotFoundError('PaktaVersion');
      if (version.status !== 'PUBLISHED') {
        throw BadRequestError('Dokumen pakta belum diterbitkan');
      }

      return ApiResponse.success(version);
    }

    // Use dual-scope service to find the active published version
    const userCtx = { id: user.id, organizationId: orgId, role: user.role };
    const version = await getActivePaktaByTypeForUser(userCtx, type as PaktaType);

    if (!version) {
      throw NotFoundError('PaktaVersion');
    }

    return ApiResponse.success({
      id: version.id,
      type: version.type,
      versionNumber: version.versionNumber,
      title: version.title,
      contentMarkdown: version.contentMarkdown,
      quizQuestions: version.quizQuestions,
      passingScore: version.passingScore,
      effectiveFrom: version.effectiveFrom,
      status: version.status,
      organizationId: version.organizationId,
    });
  },
});
