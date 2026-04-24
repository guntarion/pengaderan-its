/**
 * prisma/seed/event-execution-sample.ts
 * NAWASENA M08 — Dev sample data for Event Execution.
 *
 * Pre-condition: M06 seed already run (uses SEED_INSTANCE_3 = DONE instance).
 *
 * Creates:
 * - Updates Attendance rows from M06 seed with scanMethod, notedById, etc.
 * - 3 OutputUpload (1 FILE, 1 LINK, 1 VIDEO) for instance3
 * - 1 KegiatanEvaluation for instance3
 * - 1 KegiatanQRSession ACTIVE for instance1
 *
 * Guard: only runs outside production.
 * Idempotent: upsert / skip if already exists.
 */

import { PrismaClient, ScanMethod, OutputType, OutputScanStatus, KegiatanQRSessionStatus } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:m08');

// Deterministic seed IDs matching M06 seed
const SEED_INSTANCE_1 = 'seed-m06-instance-001';
const SEED_INSTANCE_3 = 'seed-m06-instance-003';

// M08 deterministic seed IDs
const SEED_QR_SESSION = 'seed-m08-qr-session-001';
const SEED_OUTPUT_FILE = 'seed-m08-output-file-001';
const SEED_OUTPUT_LINK = 'seed-m08-output-link-001';
const SEED_OUTPUT_VIDEO = 'seed-m08-output-video-001';
const SEED_EVALUATION = 'seed-m08-evaluation-001';

export async function seedEventExecutionSampleData(prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    log.info('Production environment — skipping M08 sample seed');
    return;
  }

  log.info('Starting M08 event execution sample seed');

  // ---- Resolve prerequisite data ----
  const org = await prisma.organization.findFirst({
    where: { code: process.env.TENANT_ORG_CODE ?? 'HMTC' },
  });

  if (!org) {
    log.warn('Organization not found — skipping M08 seed. Run M01 seed first.');
    return;
  }

  // Resolve OC user to use as notedBy
  const ocUser = await prisma.user.findFirst({
    where: { organizationId: org.id, role: 'OC' },
  });

  const anyUser = ocUser ?? (await prisma.user.findFirst({
    where: { organizationId: org.id },
  }));

  if (!anyUser) {
    log.warn('No user found — skipping M08 seed.');
    return;
  }

  // ---- Verify M06 instances exist ----
  const instance3 = await prisma.kegiatanInstance.findUnique({ where: { id: SEED_INSTANCE_3 } });
  const instance1 = await prisma.kegiatanInstance.findUnique({ where: { id: SEED_INSTANCE_1 } });

  if (!instance3) {
    log.warn('M06 DONE instance (seed-m06-instance-003) not found — skipping M08 seed. Run M06 seed first.');
    return;
  }

  // ---- 1. Update existing Attendance rows with M08 fields ----
  const attendances = await prisma.attendance.findMany({
    where: { instanceId: SEED_INSTANCE_3 },
    select: { id: true, status: true },
  });

  log.info(`Updating ${attendances.length} Attendance records with M08 fields`);

  for (let i = 0; i < attendances.length; i++) {
    const a = attendances[i];
    let method: ScanMethod;
    if (a.status === 'HADIR') {
      method = i < 10 ? ScanMethod.QR : ScanMethod.BULK;
    } else if (a.status === 'ALPA') {
      method = ScanMethod.SYSTEM_AUTO;
    } else {
      method = ScanMethod.MANUAL;
    }

    await prisma.attendance.update({
      where: { id: a.id },
      data: {
        scanMethod: method,
        notedById: method === ScanMethod.SYSTEM_AUTO ? null : anyUser.id,
        scannedAt: a.status === 'HADIR' ? new Date(Date.now() - (i + 1) * 60000) : null,
        notes: a.status === 'IZIN' || a.status === 'SAKIT' ? 'Keterangan dari seed M08' : null,
        isWalkin: false,
      },
    });
  }

  // ---- 2. Create KegiatanQRSession for instance1 ----
  if (instance1) {
    const existingQR = await prisma.kegiatanQRSession.findUnique({ where: { id: SEED_QR_SESSION } });
    if (!existingQR) {
      await prisma.kegiatanQRSession.create({
        data: {
          id: SEED_QR_SESSION,
          organizationId: org.id,
          instanceId: SEED_INSTANCE_1,
          createdByUserId: anyUser.id,
          status: KegiatanQRSessionStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // +6 hours
          shortCode: 'ABC123',
          scanCount: 0,
        },
      });
      log.info('Created KegiatanQRSession ACTIVE for instance1');
    }
  }

  // ---- 3. Create OutputUpload records for instance3 ----
  const existingFile = await prisma.outputUpload.findUnique({ where: { id: SEED_OUTPUT_FILE } });
  if (!existingFile) {
    await prisma.outputUpload.create({
      data: {
        id: SEED_OUTPUT_FILE,
        organizationId: org.id,
        instanceId: SEED_INSTANCE_3,
        uploaderId: anyUser.id,
        type: OutputType.FILE,
        url: 'https://spaces.example.com/nawasena/outputs/seed-report.pdf',
        s3Key: 'nawasena/outputs/seed-report.pdf',
        s3Bucket: 'nawasena-dev',
        caption: 'Laporan Kegiatan (Seed PDF)',
        originalFilename: 'laporan-kegiatan.pdf',
        mimeType: 'application/pdf',
        realMimeType: 'application/pdf',
        sizeBytes: 1024 * 512, // 512KB
        scanStatus: OutputScanStatus.CLEAN,
      },
    });
    log.info('Created OutputUpload FILE');
  }

  const existingLink = await prisma.outputUpload.findUnique({ where: { id: SEED_OUTPUT_LINK } });
  if (!existingLink) {
    await prisma.outputUpload.create({
      data: {
        id: SEED_OUTPUT_LINK,
        organizationId: org.id,
        instanceId: SEED_INSTANCE_3,
        uploaderId: anyUser.id,
        type: OutputType.LINK,
        url: 'https://example.com/artikel-kegiatan',
        caption: 'Artikel Liputan Kegiatan',
        scanStatus: OutputScanStatus.NA,
      },
    });
    log.info('Created OutputUpload LINK');
  }

  const existingVideo = await prisma.outputUpload.findUnique({ where: { id: SEED_OUTPUT_VIDEO } });
  if (!existingVideo) {
    await prisma.outputUpload.create({
      data: {
        id: SEED_OUTPUT_VIDEO,
        organizationId: org.id,
        instanceId: SEED_INSTANCE_3,
        uploaderId: anyUser.id,
        type: OutputType.VIDEO,
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        caption: 'Dokumentasi Video Kegiatan (Seed)',
        scanStatus: OutputScanStatus.NA,
      },
    });
    log.info('Created OutputUpload VIDEO');
  }

  // ---- 4. Create KegiatanEvaluation for instance3 ----
  const existingEval = await prisma.kegiatanEvaluation.findUnique({ where: { id: SEED_EVALUATION } });
  if (!existingEval) {
    // Check if already exists for this instance (unique instanceId)
    const evalByInstance = await prisma.kegiatanEvaluation.findUnique({
      where: { instanceId: SEED_INSTANCE_3 },
    });
    if (!evalByInstance) {
      await prisma.kegiatanEvaluation.create({
        data: {
          id: SEED_EVALUATION,
          organizationId: org.id,
          instanceId: SEED_INSTANCE_3,
          filledById: anyUser.id,
          attendancePct: 0.75,
          npsScore: 8.4,
          npsResponseCount: 10,
          redFlagsCount: 0,
          scoreL2agg: 75,
          notes: 'Sample evaluation seed — M08 dev data.',
          submittedLate: false,
        },
      });
      log.info('Created KegiatanEvaluation for instance3');
    }
  }

  log.info('M08 event execution sample seed complete');
}
