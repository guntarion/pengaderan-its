/**
 * prisma/seed/event-instance-sample.ts
 * NAWASENA M06 — Dev sample data for Event Instance, RSVP, Attendance, EventNPS.
 *
 * Creates:
 * - 3 KegiatanInstance (2 PLANNED, 1 DONE)
 * - 15 RSVPs with mix of CONFIRMED/WAITLIST/DECLINED
 * - 20 Attendance records (seeded on DONE instance)
 * - 10 EventNPS entries (on DONE instance)
 *
 * Guard: only runs outside production.
 * Idempotent: skips if data already exists (check by instanceId deterministic seed).
 */

import { PrismaClient, InstanceStatus, RSVPStatus, AttendanceStatus } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:m06');

// Deterministic seed IDs for idempotency
const SEED_INSTANCE_1 = 'seed-m06-instance-001';
const SEED_INSTANCE_2 = 'seed-m06-instance-002';
const SEED_INSTANCE_3 = 'seed-m06-instance-003';

export async function seedEventInstanceSampleData(prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    log.info('Production environment — skipping M06 sample seed');
    return;
  }

  log.info('Starting M06 event instance sample seed');

  // ---- Resolve prerequisite data ----
  const org = await prisma.organization.findFirst({
    where: { code: process.env.TENANT_ORG_CODE ?? 'HMTC' },
  });

  if (!org) {
    log.warn('Organization not found — skipping M06 seed. Run M01 seed first.');
    return;
  }

  const cohort = await prisma.cohort.findFirst({
    where: { organizationId: org.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!cohort) {
    log.warn('No cohort found — skipping M06 seed. Run M01 seed first.');
    return;
  }

  // Resolve 3 Kegiatan master IDs
  const kegiatan = await prisma.kegiatan.findMany({
    take: 3,
    orderBy: { displayOrder: 'asc' },
    where: { isActive: true },
  });

  if (kegiatan.length < 3) {
    log.warn('Fewer than 3 active Kegiatan found', { found: kegiatan.length });
    if (kegiatan.length === 0) {
      log.warn('No Kegiatan found — skipping M06 seed. Run M02 seed first.');
      return;
    }
  }

  const kg1 = kegiatan[0];
  const kg2 = kegiatan[1] ?? kegiatan[0];
  const kg3 = kegiatan[2] ?? kegiatan[0];

  // Resolve dummy Maba users
  const mabaUsers = await prisma.user.findMany({
    where: { organizationId: org.id },
    take: 20,
    orderBy: { createdAt: 'asc' },
  });

  if (mabaUsers.length < 5) {
    log.warn('Fewer than 5 users found — M06 seed will create minimal data', { found: mabaUsers.length });
  }

  const now = new Date();

  // ---- Instance 1: PLANNED (tomorrow) ----
  const existingInstance1 = await prisma.kegiatanInstance.findUnique({
    where: { id: SEED_INSTANCE_1 },
  });

  let instance1;
  if (existingInstance1) {
    instance1 = existingInstance1;
    log.info('Instance 1 already exists — skipping creation', { id: SEED_INSTANCE_1 });
  } else {
    const scheduledAt1 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    instance1 = await prisma.kegiatanInstance.create({
      data: {
        id: SEED_INSTANCE_1,
        kegiatanId: kg1.id,
        cohortId: cohort.id,
        organizationId: org.id,
        scheduledAt: scheduledAt1,
        location: 'Gedung Teknik Sipil Lt. 3, ITS Sukolilo',
        capacity: 40,
        status: InstanceStatus.PLANNED,
        notesPanitia: 'Siapkan LCD + sound system. Koordinasi dengan DOSEN_WALI 1 hari sebelum.',
        picRoleHint: 'OC',
      },
    });
    log.info('Instance 1 created (PLANNED)', { id: instance1.id, kegiatan: kg1.id });
  }

  // ---- Instance 2: PLANNED (3 days from now, unlimited capacity) ----
  const existingInstance2 = await prisma.kegiatanInstance.findUnique({
    where: { id: SEED_INSTANCE_2 },
  });

  let instance2;
  if (existingInstance2) {
    instance2 = existingInstance2;
    log.info('Instance 2 already exists — skipping creation', { id: SEED_INSTANCE_2 });
  } else {
    const scheduledAt2 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    instance2 = await prisma.kegiatanInstance.create({
      data: {
        id: SEED_INSTANCE_2,
        kegiatanId: kg2.id,
        cohortId: cohort.id,
        organizationId: org.id,
        scheduledAt: scheduledAt2,
        location: 'https://meet.google.com/nawasena-2026 (Online)',
        capacity: null, // unlimited
        status: InstanceStatus.PLANNED,
        materiLinkUrl: 'https://drive.google.com/sample-materi',
      },
    });
    log.info('Instance 2 created (PLANNED, unlimited)', { id: instance2.id, kegiatan: kg2.id });
  }

  // ---- Instance 3: DONE (2 days ago) ----
  const existingInstance3 = await prisma.kegiatanInstance.findUnique({
    where: { id: SEED_INSTANCE_3 },
  });

  let instance3;
  if (existingInstance3) {
    instance3 = existingInstance3;
    log.info('Instance 3 already exists — skipping creation', { id: SEED_INSTANCE_3 });
  } else {
    const scheduledAt3 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    instance3 = await prisma.kegiatanInstance.create({
      data: {
        id: SEED_INSTANCE_3,
        kegiatanId: kg3.id,
        cohortId: cohort.id,
        organizationId: org.id,
        scheduledAt: scheduledAt3,
        executedAt: scheduledAt3,
        location: 'Aula Teknik Informatika, ITS Sukolilo',
        capacity: 30,
        status: InstanceStatus.DONE,
        notesPanitia: 'Kegiatan berjalan lancar. 15 hadir dari 20 CONFIRMED.',
        npsRequestedAt: new Date(scheduledAt3.getTime() + 30 * 60 * 1000), // 30 min after
      },
    });
    log.info('Instance 3 created (DONE)', { id: instance3.id, kegiatan: kg3.id });
  }

  // ---- Seed RSVPs ----
  // Instance 1: 10 CONFIRMED, 3 WAITLIST, 2 DECLINED
  const instance1Users = mabaUsers.slice(0, Math.min(15, mabaUsers.length));
  let rsvpsCreated = 0;

  for (let i = 0; i < instance1Users.length; i++) {
    const user = instance1Users[i];
    const existingRSVP = await prisma.rSVP.findUnique({
      where: { instanceId_userId: { instanceId: instance1.id, userId: user.id } },
    });

    if (!existingRSVP) {
      let status: RSVPStatus;
      let waitlistPosition: number | null = null;

      if (i < 10) {
        status = RSVPStatus.CONFIRMED;
      } else if (i < 13) {
        status = RSVPStatus.WAITLIST;
        waitlistPosition = i - 9; // positions 1, 2, 3
      } else {
        status = RSVPStatus.DECLINED;
      }

      await prisma.rSVP.create({
        data: {
          instanceId: instance1.id,
          userId: user.id,
          organizationId: org.id,
          status,
          respondedAt: new Date(now.getTime() - (15 - i) * 60 * 60 * 1000), // staggered
          waitlistPosition,
          cancelledAt: status === RSVPStatus.DECLINED ? new Date() : null,
        },
      });
      rsvpsCreated++;
    }
  }

  // Instance 2: 12 CONFIRMED, 3 DECLINED (unlimited capacity)
  const instance2Users = mabaUsers.slice(0, Math.min(15, mabaUsers.length));
  for (let i = 0; i < instance2Users.length; i++) {
    const user = instance2Users[i];
    const existingRSVP = await prisma.rSVP.findUnique({
      where: { instanceId_userId: { instanceId: instance2.id, userId: user.id } },
    });

    if (!existingRSVP) {
      const status: RSVPStatus = i < 12 ? RSVPStatus.CONFIRMED : RSVPStatus.DECLINED;
      await prisma.rSVP.create({
        data: {
          instanceId: instance2.id,
          userId: user.id,
          organizationId: org.id,
          status,
          respondedAt: new Date(now.getTime() - (15 - i) * 60 * 60 * 1000),
          cancelledAt: status === RSVPStatus.DECLINED ? new Date() : null,
        },
      });
      rsvpsCreated++;
    }
  }

  // Instance 3: 15 CONFIRMED (DONE instance, all confirmed)
  const instance3Users = mabaUsers.slice(0, Math.min(15, mabaUsers.length));
  for (let i = 0; i < instance3Users.length; i++) {
    const user = instance3Users[i];
    const existingRSVP = await prisma.rSVP.findUnique({
      where: { instanceId_userId: { instanceId: instance3.id, userId: user.id } },
    });

    if (!existingRSVP) {
      await prisma.rSVP.create({
        data: {
          instanceId: instance3.id,
          userId: user.id,
          organizationId: org.id,
          status: RSVPStatus.CONFIRMED,
          respondedAt: new Date(instance3.scheduledAt.getTime() - (15 - i) * 60 * 60 * 1000),
        },
      });
      rsvpsCreated++;
    }
  }

  log.info('RSVPs seeded', { count: rsvpsCreated });

  // ---- Seed Attendance for Instance 3 (DONE) ----
  let attendanceCreated = 0;
  for (let i = 0; i < instance3Users.length; i++) {
    const user = instance3Users[i];
    const existingAttendance = await prisma.attendance.findUnique({
      where: { instanceId_userId: { instanceId: instance3.id, userId: user.id } },
    });

    if (!existingAttendance) {
      let status: AttendanceStatus;
      if (i < 12) {
        status = AttendanceStatus.HADIR;
      } else if (i < 14) {
        status = AttendanceStatus.IZIN;
      } else {
        status = AttendanceStatus.ALPA;
      }

      await prisma.attendance.create({
        data: {
          instanceId: instance3.id,
          userId: user.id,
          organizationId: org.id,
          status,
          notedAt: instance3.executedAt ?? instance3.scheduledAt,
        },
      });
      attendanceCreated++;
    }
  }

  log.info('Attendance records seeded', { count: attendanceCreated });

  // ---- Seed EventNPS for Instance 3 (DONE, from HADIR users) ----
  const hadirUsers = instance3Users.slice(0, 12); // First 12 = HADIR
  const npsUsers = hadirUsers.slice(0, 10); // 10 of 12 submit NPS (83% response rate)
  const npsScores = [9, 8, 10, 7, 9, 8, 6, 10, 9, 8];
  const feltSafeScores = [5, 4, 5, 3, 4, 5, 3, 5, 4, 4];
  const meaningfulScores = [5, 4, 5, 4, 5, 4, 3, 5, 4, 5];
  let npsCreated = 0;

  for (let i = 0; i < npsUsers.length; i++) {
    const user = npsUsers[i];
    const existingNPS = await prisma.eventNPS.findUnique({
      where: { userId_instanceId: { userId: user.id, instanceId: instance3.id } },
    });

    if (!existingNPS) {
      await prisma.eventNPS.create({
        data: {
          instanceId: instance3.id,
          userId: user.id,
          organizationId: org.id,
          npsScore: npsScores[i] ?? 8,
          feltSafe: feltSafeScores[i] ?? 4,
          meaningful: meaningfulScores[i] ?? 4,
          comment: i < 3 ? `Kegiatan sangat bermanfaat! ${i === 0 ? 'Fasilitator komunikatif.' : i === 1 ? 'Materi relevan dengan kebutuhan.' : 'Suasana aman dan nyaman.'}` : null,
          recordedAt: new Date(instance3.scheduledAt.getTime() + (2 + i) * 60 * 60 * 1000),
        },
      });
      npsCreated++;
    }
  }

  log.info('EventNPS entries seeded', { count: npsCreated });

  log.info('M06 sample seed completed', {
    instances: { instance1: instance1.id, instance2: instance2.id, instance3: instance3.id },
    rsvpsCreated,
    attendanceCreated,
    npsCreated,
  });
}
