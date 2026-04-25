/**
 * src/app/api/passport/[entryId]/route.ts
 * NAWASENA M05 — GET: Fetch entry detail + evidence + history chain + signed URLs.
 *
 * Auth: authenticated users (Maba sees own, verifier sees assigned, SC sees all)
 */

import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateParams,
  idParamSchema,
  NotFoundError,
  ForbiddenError,
} from '@/lib/api';
import { issueGetUrl } from '@/lib/storage/presigned-download';
import { AuditAction } from '@prisma/client';

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log }) => {
    const { id: entryId } = validateParams(params, idParamSchema);

    const entry = await prisma.passportEntry.findUnique({
      where: { id: entryId },
      include: {
        item: true,
        evidenceUploads: true,
        verifier: { select: { id: true, fullName: true, role: true } },
        escalatedTo: { select: { id: true, fullName: true, role: true } },
        overriddenBy: { select: { id: true, fullName: true, role: true } },
        qrSession: { select: { id: true, eventName: true, expiresAt: true } },
      },
    });
    if (!entry) throw NotFoundError('PassportEntry');

    // Authorization: Maba only sees own, verifier sees assigned, SC/SUPERADMIN sees all
    const isOwner = entry.userId === user.id;
    const isVerifier = entry.verifierId === user.id;
    const isEscalatedTo = entry.escalatedToUserId === user.id;
    const isAdmin = user.role === 'SC' || user.role === 'SUPERADMIN';

    if (!isOwner && !isVerifier && !isEscalatedTo && !isAdmin) {
      throw ForbiddenError();
    }

    // Generate presigned URL for evidence uploads
    const evidenceWithUrls = await Promise.all(
      entry.evidenceUploads.map(async (upload) => {
        let signedUrl: string | null = null;
        try {
          signedUrl = await issueGetUrl({ key: upload.s3Key, ttlSeconds: 900 });
        } catch {
          log.warn('Failed to generate signed URL for evidence', { s3Key: upload.s3Key });
        }
        return { ...upload, signedUrl };
      }),
    );

    // Audit log: SC/SUPERADMIN accessing photos
    if (isAdmin && evidenceWithUrls.length > 0) {
      prisma.nawasenaAuditLog
        .create({
          data: {
            organizationId: entry.organizationId,
            action: AuditAction.PASSPORT_PHOTO_ACCESS_BY_SC,
            actorUserId: user.id,
            entityType: 'PassportEntry',
            entityId: entryId,
            metadata: { role: user.role },
          },
        })
        .catch((err) => {
          log.warn('Failed to create audit log for SC photo access', { error: err });
        });
    }

    // Build history chain (walk previousEntryId)
    const historyChain: Array<{
      id: string;
      status: string;
      submittedAt: Date;
      verifierNote: string | null;
      evidenceType: string;
    }> = [];

    let current = entry.previousEntryId;
    let depth = 0;
    while (current && depth < 10) {
      const prev = await prisma.passportEntry.findUnique({
        where: { id: current },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          verifierNote: true,
          evidenceType: true,
          previousEntryId: true,
        },
      });
      if (!prev) break;
      historyChain.push(prev);
      current = prev.previousEntryId;
      depth++;
    }

    return ApiResponse.success({
      ...entry,
      evidenceUploads: evidenceWithUrls,
      historyChain,
    });
  },
});
