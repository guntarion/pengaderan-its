/**
 * src/app/api/passport/upload-url/route.ts
 * NAWASENA M05 — POST: Issue presigned PUT URL for evidence upload.
 *
 * Client calls this → gets signed URL → uploads directly to Spaces.
 * Server validates: size ≤ 5MB, mime in whitelist, item exists.
 */

import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateBody,
  BadRequestError,
  NotFoundError,
} from '@/lib/api';
import { buildKey } from '@/lib/storage/object-key';
import { issuePutUrl } from '@/lib/storage/presigned-upload';
import { ALLOWED_MIME_TYPES } from '@/lib/storage/mime-validator';
import { z } from 'zod';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const uploadUrlSchema = z.object({
  itemId: z.string().min(1),
  filename: z.string().min(1).max(200),
  mime: z.string().min(1),
  size: z.number().int().positive(),
});

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const { itemId, filename, mime, size } = await validateBody(req, uploadUrlSchema);

    // Validate size
    if (size > MAX_SIZE_BYTES) {
      throw BadRequestError(`File too large: ${size} bytes exceeds max 5MB (${MAX_SIZE_BYTES} bytes)`);
    }

    // Validate mime type
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
      throw BadRequestError(
        `MIME type not allowed: ${mime}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    // Validate item exists
    const item = await prisma.passportItem.findUnique({ where: { id: itemId } });
    if (!item) throw NotFoundError('PassportItem');

    log.info('Issuing upload URL', { userId: user.id, itemId, mime, size });

    // Build object key
    const key = buildKey({
      orgId: user.id.slice(0, 8), // use first segment of user ID for org prefix
      userId: user.id,
      itemId,
      filename,
    });

    // Issue presigned URL
    const result = await issuePutUrl({
      key,
      contentType: mime,
      contentLength: size,
      ttlSeconds: 900, // 15 minutes
    });

    return ApiResponse.success({
      uploadUrl: result.uploadUrl,
      s3Key: result.s3Key,
      bucket: result.bucket,
      expiresAt: result.expiresAt,
    });
  },
});
