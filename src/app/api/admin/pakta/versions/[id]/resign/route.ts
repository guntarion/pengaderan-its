/**
 * POST /api/admin/pakta/versions/[id]/resign
 * Trigger fan-out re-sign for all affected users of a given published PaktaVersion.
 *
 * DIGITAL (SOCIAL_CONTRACT_MABA): fan-out to ALL active MABA across all orgs.
 * ETIK (PAKTA_PANITIA, PAKTA_PENGADER_2027): fan-out to panitia in that org only.
 *
 * Roles: SC (own org ETIK only), SUPERADMIN (any)
 *
 * Phase RV-D — M01 Revisi Multi-HMJ
 */

import { createApiHandler, ApiResponse, NotFoundError, ForbiddenError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { triggerResign } from '@/services/pakta.service';

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (_req, { user, params, log }) => {
    const versionId = params?.id as string;
    if (!versionId) throw NotFoundError('PaktaVersion');

    // Fetch version to check ownership
    const version = await prisma.paktaVersion.findUnique({
      where: { id: versionId },
      select: { id: true, type: true, organizationId: true, status: true, versionNumber: true },
    });

    if (!version) throw NotFoundError('PaktaVersion');

    if (version.status !== 'PUBLISHED') {
      throw ForbiddenError('Hanya versi PUBLISHED yang dapat di-trigger re-sign');
    }

    // SC can only trigger re-sign for their own org's ETIK versions
    if (user.role === 'SC') {
      if (version.type === 'SOCIAL_CONTRACT_MABA') {
        throw ForbiddenError('SC tidak dapat trigger re-sign Pakta DIGITAL institusi-wide');
      }
      if (version.organizationId !== user.organizationId) {
        throw ForbiddenError('SC hanya dapat trigger re-sign untuk versi pakta org sendiri');
      }
    }

    log.info('Triggering re-sign fan-out', {
      versionId,
      type: version.type,
      orgId: version.organizationId,
      actorRole: user.role,
    });

    const { affectedCount } = await triggerResign(versionId, user.id);

    log.info('Re-sign fan-out triggered', { versionId, affectedCount });

    return ApiResponse.success({
      triggered: true,
      versionId,
      type: version.type,
      versionNumber: version.versionNumber,
      affectedCount,
    });
  },
});
