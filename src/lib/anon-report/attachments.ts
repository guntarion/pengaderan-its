/**
 * src/lib/anon-report/attachments.ts
 * NAWASENA M12 — S3 attachment helpers for anonymous channel.
 *
 * MIME whitelist: image/jpeg, image/png, application/pdf only.
 * Max file size enforced by presign content-length constraint.
 *
 * Key patterns:
 *   Temp:  anon/uploads/{uuid}.{ext}          (pending EXIF strip)
 *   Final: anon/reports/{reportId}/{uuid}.{ext} (after EXIF strip)
 *
 * Reuses M05 S3 client helpers from @/lib/storage.
 */

import { randomUUID } from 'crypto';
import { createLogger } from '@/lib/logger';
import { issuePutUrl } from '@/lib/storage/presigned-upload';
import { issueGetUrl } from '@/lib/storage/presigned-download';
import { isStorageConfigured } from '@/lib/storage/s3-client';

const log = createLogger('anon-attachments');

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const PRESIGN_TTL_SECONDS = 900; // 15 minutes

/**
 * Issue a presigned PUT URL for anonymous attachment upload.
 *
 * Returns a tmpKey in the format: anon/uploads/{uuid}.{ext}
 * The EXIF worker will move this to anon/reports/{reportId}/ after stripping.
 *
 * @param mime - MIME type of the file (must be in ALLOWED_MIMES)
 * @param contentLength - File size in bytes (enforced via presign)
 * @returns presignUrl and tmpKey
 * @throws Error if MIME type not allowed or storage not configured
 */
export async function presignAnonUpload(
  mime: string,
  contentLength: number,
): Promise<{ presignUrl: string; tmpKey: string }> {
  if (!ALLOWED_MIMES.has(mime)) {
    throw new Error(
      `MIME type not allowed: ${mime}. Use image/jpeg, image/png, or application/pdf.`,
    );
  }

  if (contentLength > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large: ${contentLength} bytes. Maximum is ${MAX_FILE_SIZE_BYTES}.`);
  }

  if (!isStorageConfigured()) {
    throw new Error('Storage not configured — SPACES_* env vars required');
  }

  const ext = MIME_TO_EXT[mime] ?? 'bin';
  const uuid = randomUUID();
  const tmpKey = `anon/uploads/${uuid}.${ext}`;

  const { uploadUrl } = await issuePutUrl({
    key: tmpKey,
    contentType: mime,
    contentLength,
    ttlSeconds: PRESIGN_TTL_SECONDS,
  });

  log.info('Presigned anon upload URL issued', {
    ext,
    contentLength,
    tmpKey: tmpKey.slice(0, 20) + '...',
  });

  return { presignUrl: uploadUrl, tmpKey };
}

/**
 * Validate and confirm an attachment: move from tmp key to final key.
 *
 * Called after EXIF strip (or if EXIF strip not applicable for PDFs).
 *
 * @param reportId - The AnonReport ID (used in final key path)
 * @param tmpKey - The tmp key from presignAnonUpload (must match pattern)
 * @returns Final S3 key
 */
export async function confirmAnonAttachment(
  reportId: string,
  tmpKey: string,
): Promise<string> {
  // Validate tmpKey pattern: anon/uploads/{uuid}.{ext}
  const tmpKeyPattern = /^anon\/uploads\/[a-f0-9-]+\.(jpg|jpeg|png|pdf)$/i;
  if (!tmpKeyPattern.test(tmpKey)) {
    throw new Error(`Invalid tmpKey pattern: ${tmpKey}`);
  }

  const ext = tmpKey.split('.').pop() ?? 'bin';
  const uuid = randomUUID();
  const finalKey = `anon/reports/${reportId}/${uuid}.${ext}`;

  log.info('Confirming anon attachment', {
    reportId: reportId.slice(0, 8) + '...',
    finalKey: finalKey.slice(0, 30) + '...',
  });

  // Note: Actual S3 copy is done by the EXIF worker (anon-exif-worker.ts).
  // This function returns the target key for the worker to use.
  // In the submit flow, we store tmpKey initially and update after EXIF strip.
  return finalKey;
}

/**
 * Generate a presigned GET URL for downloading an anon attachment.
 *
 * TTL: 15 minutes (900s default).
 * For BLM/Satgas users only — enforced by API route auth.
 *
 * @param key - The S3 key (final key, not tmp)
 * @param ttlSeconds - URL TTL (default 900s = 15 min)
 * @returns Signed URL string
 */
export async function getAnonAttachmentSignedUrl(
  key: string,
  ttlSeconds = PRESIGN_TTL_SECONDS,
): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error('Storage not configured — SPACES_* env vars required');
  }

  const url = await issueGetUrl({ key, ttlSeconds });

  log.info('Anon attachment signed URL issued', {
    keyPrefix: key.slice(0, 20) + '...',
    ttlSeconds,
  });

  return url;
}
