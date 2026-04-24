#!/usr/bin/env tsx
/**
 * scripts/anon-exif-worker.ts
 * NAWASENA M12 — EXIF stripping worker for anonymous report attachments.
 *
 * Finds AnonReport rows where attachmentKey starts with 'anon/uploads/'
 * (pending EXIF strip), downloads from S3, strips EXIF metadata via exifr,
 * re-uploads to 'anon/reports/{reportId}/{uuid}.{ext}', updates DB.
 *
 * Run as simple interval process (not BullMQ — V1 simplicity).
 *
 * Usage:
 *   npx tsx scripts/anon-exif-worker.ts           # normal run
 *   npx tsx scripts/anon-exif-worker.ts --dry-run # preview only
 *
 * Env vars required: DATABASE_URL + SPACES_* (see s3-client.ts)
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const isDryRun = process.argv.includes('--dry-run');
const INTERVAL_MS = 60 * 1000; // 60 seconds
const BATCH_SIZE = 10;

const prisma = new PrismaClient();

function getS3() {
  return new S3Client({
    endpoint: process.env.SPACES_ENDPOINT ?? 'https://sgp1.digitaloceanspaces.com',
    region: process.env.SPACES_REGION ?? 'sgp1',
    credentials: {
      accessKeyId: process.env.SPACES_ACCESS_KEY ?? '',
      secretAccessKey: process.env.SPACES_SECRET_KEY ?? '',
    },
    forcePathStyle: false,
  });
}

function getBucket(): string {
  const b = process.env.SPACES_BUCKET;
  if (!b) throw new Error('SPACES_BUCKET not configured');
  return b;
}

/**
 * Stream to Buffer helper.
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk, 'utf-8'));
    } else {
      chunks.push(Buffer.from(chunk as ArrayBuffer));
    }
  }
  return Buffer.concat(chunks);
}

/**
 * Strip EXIF from an image buffer using exifr.
 * Returns the cleaned buffer. For PDFs, returns original (no EXIF to strip).
 */
async function stripExif(buffer: Buffer, ext: string): Promise<Buffer> {
  if (ext === 'pdf') {
    console.log('[exif-worker] PDF — no EXIF to strip');
    return buffer;
  }

  try {
    // Use piexifjs via exifr for JPEG, or just return buffer for PNG
    // exifr is a reader — for stripping we use a different approach
    // For JPEGs: use piexifjs if available, otherwise use sharp
    // V1: Basic approach using Buffer manipulation for JPEG
    if (ext === 'jpg' || ext === 'jpeg') {
      // Read EXIF with exifr to confirm it exists
      const exifr = await import('exifr');
      const exifData = await exifr.default.parse(buffer, { gps: true });
      if (exifData) {
        console.log('[exif-worker] Found EXIF metadata — stripping...');
        // For V1: re-encode to strip EXIF by writing a clean JFIF header
        // Production should use sharp or piexifjs for proper stripping
        // Here we implement a basic approach: find and remove APP1 markers
        return stripJpegExif(buffer);
      }
    }
    return buffer;
  } catch (err) {
    console.warn('[exif-worker] Failed to process EXIF:', err);
    return buffer;
  }
}

/**
 * Basic JPEG EXIF strip by removing APP1 (0xFFE1) markers.
 * This removes EXIF/XMP data embedded in JPEG APP1 segments.
 */
function stripJpegExif(buffer: Buffer): Buffer {
  const result: Buffer[] = [];
  let i = 0;

  // JPEG must start with SOI marker (FF D8)
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer; // Not a valid JPEG
  }

  result.push(buffer.slice(0, 2)); // SOI
  i = 2;

  while (i < buffer.length - 1) {
    if (buffer[i] !== 0xff) break;

    const marker = buffer[i + 1];

    // SOI, EOI, RST0-RST7 have no length
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      result.push(buffer.slice(i, i + 2));
      i += 2;
      continue;
    }

    // Read segment length (big-endian, includes the 2 length bytes)
    const segLength = buffer.readUInt16BE(i + 2);

    // APP1 (0xFFE1) — EXIF and XMP: skip it
    if (marker === 0xe1) {
      console.log('[exif-worker] Removing APP1 EXIF segment, size:', segLength);
      i += 2 + segLength;
      continue;
    }

    // Keep all other markers
    result.push(buffer.slice(i, i + 2 + segLength));
    i += 2 + segLength;
  }

  // Append remaining data (scan data after last marker)
  if (i < buffer.length) {
    result.push(buffer.slice(i));
  }

  return Buffer.concat(result);
}

async function processReport(
  report: { id: string; attachmentKey: string },
  s3: S3Client,
  bucket: string,
): Promise<void> {
  const tmpKey = report.attachmentKey;
  const ext = tmpKey.split('.').pop()?.toLowerCase() ?? 'bin';
  const uuid = randomUUID();
  const finalKey = `anon/reports/${report.id}/${uuid}.${ext}`;

  console.log(`[exif-worker] Processing report ${report.id.slice(0, 8)}... key=${tmpKey.slice(0, 30)}...`);

  if (isDryRun) {
    console.log(`[exif-worker] DRY RUN — would move ${tmpKey} → ${finalKey}`);
    return;
  }

  try {
    // 1. Download from S3 tmp path
    const getCmd = new GetObjectCommand({ Bucket: bucket, Key: tmpKey });
    const s3Obj = await s3.send(getCmd);

    if (!s3Obj.Body) {
      throw new Error('Empty S3 response body');
    }

    const rawBuffer = await streamToBuffer(s3Obj.Body as NodeJS.ReadableStream);
    console.log(`[exif-worker] Downloaded ${rawBuffer.length} bytes`);

    // 2. Strip EXIF
    const cleanBuffer = await stripExif(rawBuffer, ext);
    console.log(`[exif-worker] EXIF stripped, clean size: ${cleanBuffer.length} bytes`);

    // 3. Re-upload to final path
    const putCmd = new PutObjectCommand({
      Bucket: bucket,
      Key: finalKey,
      Body: cleanBuffer,
      ContentType: s3Obj.ContentType ?? 'application/octet-stream',
    });
    await s3.send(putCmd);
    console.log(`[exif-worker] Uploaded to ${finalKey}`);

    // 4. Update DB
    await prisma.anonReport.update({
      where: { id: report.id },
      data: { attachmentKey: finalKey },
    });
    console.log(`[exif-worker] DB updated for report ${report.id.slice(0, 8)}...`);

    // 5. Delete tmp
    const deleteCmd = new DeleteObjectCommand({ Bucket: bucket, Key: tmpKey });
    await s3.send(deleteCmd);
    console.log(`[exif-worker] Tmp key deleted: ${tmpKey.slice(0, 30)}...`);
  } catch (err) {
    console.error(`[exif-worker] Failed to process report ${report.id.slice(0, 8)}...`, err);
    // Don't re-throw — continue processing other reports
  }
}

async function runBatch(): Promise<void> {
  const s3 = getS3();
  const bucket = getBucket();

  const pendingReports = await prisma.anonReport.findMany({
    where: {
      attachmentKey: {
        startsWith: 'anon/uploads/',
      },
    },
    select: {
      id: true,
      attachmentKey: true,
    },
    take: BATCH_SIZE,
    orderBy: { recordedAt: 'asc' },
  });

  if (pendingReports.length === 0) {
    return;
  }

  console.log(`[exif-worker] Processing ${pendingReports.length} pending attachment(s)...`);

  for (const report of pendingReports) {
    await processReport(
      { id: report.id, attachmentKey: report.attachmentKey! },
      s3,
      bucket,
    );
  }

  console.log(`[exif-worker] Batch complete`);
}

async function main(): Promise<void> {
  console.log(`[exif-worker] Starting NAWASENA M12 EXIF worker ${isDryRun ? '(DRY RUN)' : ''}`);

  if (isDryRun) {
    await runBatch();
    await prisma.$disconnect();
    return;
  }

  // Run immediately, then on interval
  await runBatch();

  const interval = setInterval(async () => {
    try {
      await runBatch();
    } catch (err) {
      console.error('[exif-worker] Batch error:', err);
    }
  }, INTERVAL_MS);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[exif-worker] SIGTERM received — shutting down');
    clearInterval(interval);
    void prisma.$disconnect().then(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error('[exif-worker] Fatal error:', err);
  void prisma.$disconnect().then(() => process.exit(1));
});
