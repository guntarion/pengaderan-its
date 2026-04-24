/**
 * src/app/api/passport/items/[itemId]/route.ts
 * NAWASENA M05 — GET: Single passport item + caller's current active entry + history chain.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateParams, idParamSchema, NotFoundError } from '@/lib/api';
import { issueGetUrl } from '@/lib/storage/presigned-download';

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log }) => {
    const { id: itemId } = validateParams(params, idParamSchema);

    log.info('Fetching passport item detail', { itemId, userId: user.id });

    const item = await prisma.passportItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        description: true,
        dimensi: true,
        evidenceType: true,
        targetWaktu: true,
        verifierRoleHint: true,
      },
    });

    if (!item) throw NotFoundError('PassportItem');

    // Normalize field names for frontend
    const normalizedItem = {
      id: item.id,
      namaItem: item.description,
      dimensi: item.dimensi,
      evidenceType: item.evidenceType,
      keterangan: item.targetWaktu ?? null,
    };

    // Get user's most recent non-cancelled entry for this item
    const activeEntry = await prisma.passportEntry.findFirst({
      where: { userId: user.id, itemId, status: { not: 'CANCELLED' } },
      orderBy: { submittedAt: 'desc' },
      include: {
        evidenceUploads: true,
        verifier: { select: { id: true, fullName: true, role: true } },
      },
    });

    let currentEntry = null;

    if (activeEntry) {
      // Generate signed URLs for evidence
      const evidenceWithUrls = await Promise.all(
        activeEntry.evidenceUploads.map(async (upload) => {
          let signedUrl: string | null = null;
          try {
            signedUrl = await issueGetUrl({ key: upload.s3Key, ttlSeconds: 900 });
          } catch {
            log.warn('Failed to generate signed URL', { s3Key: upload.s3Key });
          }
          return { ...upload, signedUrl };
        }),
      );

      // Walk history chain (find previous rejected/cancelled entries)
      const history = await prisma.passportEntry.findMany({
        where: {
          userId: user.id,
          itemId,
          status: { in: ['REJECTED', 'CANCELLED'] },
        },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          verifierNote: true,
          evidenceType: true,
        },
        take: 10,
      });

      // Extract mabaNotes from metadataJson (stored as captionNote)
      const meta = activeEntry.metadataJson as Record<string, unknown> | null;
      const mabaNotes = meta?.captionNote as string | undefined ?? null;

      currentEntry = {
        id: activeEntry.id,
        status: activeEntry.status,
        evidenceType: activeEntry.evidenceType,
        mabaNotes,
        verifierNote: activeEntry.verifierNote,
        submittedAt: activeEntry.submittedAt.toISOString(),
        item: {
          id: normalizedItem.id,
          namaItem: normalizedItem.namaItem,
          dimensi: normalizedItem.dimensi,
          keterangan: normalizedItem.keterangan,
        },
        verifier: activeEntry.verifier,
        evidenceUploads: evidenceWithUrls,
        history,
      };
    }

    return ApiResponse.success({
      ...normalizedItem,
      currentEntry,
    });
  },
});
