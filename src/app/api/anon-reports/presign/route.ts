/**
 * src/app/api/anon-reports/presign/route.ts
 * POST /api/anon-reports/presign
 *
 * Public endpoint for pre-signing S3 PUT URL for anonymous attachment upload.
 * Rate limit: 10 per 24h.
 * Captcha required.
 *
 * Temporary upload path: anon/uploads/{uuid}.{ext}
 * After submit, EXIF worker moves to: anon/reports/{reportId}/{uuid}.{ext}
 */

import { createPublicAnonHandler, ApiResponse } from '@/lib/anon-report/public-api-handler';
import { presignSchema } from '@/lib/anon-report/schemas';
import { issuePutUrl } from '@/lib/storage/presigned-upload';
import { randomUUID } from 'crypto';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const POST = createPublicAnonHandler({
  schema: presignSchema,
  rateLimitKey: 'presign',
  rateLimitMax: 10,
  rateLimitWindowSeconds: 86400, // 24 hours
  requireCaptcha: true,
  handler: async ({ body, log }) => {
    log.info('Presign request received', { mimeType: body.mimeType });

    const ext = MIME_TO_EXT[body.mimeType];
    if (!ext) {
      return ApiResponse.fail(400, 'BAD_REQUEST', 'Tipe file tidak didukung.');
    }

    const uuid = randomUUID();
    const key = `anon/uploads/${uuid}.${ext}`;

    const result = await issuePutUrl({
      key,
      contentType: body.mimeType,
      contentLength: MAX_FILE_SIZE, // Max allowed size
      ttlSeconds: 900, // 15 min to complete upload
    });

    log.info('Presign URL issued');

    return ApiResponse.success({
      uploadUrl: result.uploadUrl,
      attachmentTmpKey: key,
      expiresAt: result.expiresAt,
    }, 201);
  },
});
