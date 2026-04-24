/**
 * src/lib/storage/mime-validator.ts
 * NAWASENA M05 — Server-side mime validation by reading first 4KB from S3.
 *
 * Uses the `file-type` library for byte-level detection (ignores file extension).
 * Prevents disguised uploads (e.g. executable renamed as .jpg).
 */

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getSpacesBucket } from './s3-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('storage:mime-validator');

/** Allowed MIME types for evidence uploads. */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export interface MimeValidationResult {
  clean: boolean;
  realMime: string | null;
  claimedMime: string;
  mismatch: boolean;
}

/**
 * Validate the real MIME type of an S3 object by reading its first 4KB.
 *
 * @param s3Key      - Object key in S3
 * @param claimedMime - MIME type claimed by the client
 * @returns validation result
 */
export async function validateMimeReal(
  s3Key: string,
  claimedMime: string,
): Promise<MimeValidationResult> {
  const client = getS3Client();
  const bucket = getSpacesBucket();

  try {
    // Read first 4096 bytes only
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Range: 'bytes=0-4095',
    });

    const response = await client.send(command);
    const body = response.Body;
    if (!body) {
      log.warn('Empty body from S3 for mime check', { s3Key });
      return { clean: false, realMime: null, claimedMime, mismatch: true };
    }

    // Convert stream to Buffer
    const chunks: Uint8Array[] = [];
    // body is a ReadableStream-like; iterate
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Dynamic import to handle ESM module
    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(buffer);

    const realMime = detected?.mime ?? null;
    const isAllowed = realMime ? (ALLOWED_MIME_TYPES as readonly string[]).includes(realMime) : false;
    const mismatch = realMime !== claimedMime;

    log.debug('Mime validation result', {
      s3Key,
      claimedMime,
      realMime,
      isAllowed,
      mismatch,
    });

    return {
      clean: isAllowed && !mismatch,
      realMime,
      claimedMime,
      mismatch,
    };
  } catch (err) {
    log.error('Mime validation failed', { s3Key, error: err });
    return { clean: false, realMime: null, claimedMime, mismatch: true };
  }
}
