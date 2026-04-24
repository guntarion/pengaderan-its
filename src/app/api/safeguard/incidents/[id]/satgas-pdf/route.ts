/**
 * GET /api/safeguard/incidents/[id]/satgas-pdf
 * NAWASENA M10 — Get (or generate) Satgas PDF presigned URL.
 *
 * - If incident.satgasPdfKey exists → re-signs + returns URL (TTL 7 days).
 * - Adds ATTACHMENT_DOWNLOADED audit trail.
 *
 * Allowed roles: SC, Safeguard Officer, PEMBINA.
 */

import {
  createApiHandler,
  ApiResponse,
  NotFoundError,
  ForbiddenError,
  validateParams,
  idParamSchema,
} from '@/lib/api';
import { UserRole, AuditAction, Prisma } from '@prisma/client';
import { prisma } from '@/utils/prisma';
import { getSatgasPdfUrl } from '@/lib/safeguard/satgas-export';

const ALLOWED_ROLES = [UserRole.SC, UserRole.PEMBINA, UserRole.SATGAS] as string[];

export const GET = createApiHandler({
  auth: true,
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);

    const rawUser = ctx.user as unknown as {
      id: string;
      role: string;
      organizationId?: string;
      isSafeguardOfficer?: boolean;
      displayName?: string;
      fullName?: string;
    };

    const isSafeguardOfficer = rawUser.isSafeguardOfficer ?? false;
    const isAllowed = ALLOWED_ROLES.includes(rawUser.role) || isSafeguardOfficer;

    if (!isAllowed) throw ForbiddenError('Only SC, Safeguard Officers, or Pembina can access Satgas PDFs');

    // Verify incident exists + org scope
    const incident = await prisma.safeguardIncident.findUnique({
      where: { id },
      select: { id: true, organizationId: true, satgasPdfKey: true },
    });

    if (!incident) throw NotFoundError('Incident');
    if (incident.organizationId !== rawUser.organizationId) throw ForbiddenError('Access denied');

    if (!incident.satgasPdfKey) {
      throw NotFoundError('Satgas PDF not yet generated for this incident');
    }

    ctx.log.info('Fetching Satgas PDF URL', { incidentId: id, actorId: rawUser.id });

    const result = await getSatgasPdfUrl(id);

    // Audit: record PDF download
    try {
      await prisma.nawasenaAuditLog.create({
        data: {
          action: AuditAction.ATTACHMENT_DOWNLOAD,
          actorUserId: rawUser.id,
          organizationId: rawUser.organizationId ?? '',
          entityType: 'SatgasPdf',
          entityId: id,
          metadata: {
            s3Key: result.s3Key,
            downloaderRole: rawUser.role,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (auditErr) {
      ctx.log.error('Failed to write PDF download audit log', { error: auditErr });
    }

    ctx.log.info('Satgas PDF URL issued', { incidentId: id, expiresAt: result.expiresAt });

    return ApiResponse.success({
      url: result.url,
      s3Key: result.s3Key,
      expiresAt: result.expiresAt.toISOString(),
    });
  },
});
