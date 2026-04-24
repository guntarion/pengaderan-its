/**
 * prisma/seed/m09-logbook.ts
 * NAWASENA M09 — Dev-mode sample data for KP & Kasuh Logbook.
 *
 * Seeds:
 *   - 2 KPLogDaily per KP (last 5 weekdays)
 *   - 1 KPLogWeekly per KP (previous week)
 *   - 1 KasuhLog cycle 1 MET per Kasuh pair
 *
 * Guard: only runs when NODE_ENV !== 'production'.
 * Idempotent: upsert by unique key.
 */

import { PrismaClient, KasuhLogAttendance, KPGroupStatus, PairStatus } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:m09-logbook');

/**
 * Returns the last N weekday Dates (Mon-Fri) before today.
 */
function getLastNWeekdays(n: number): Date[] {
  const dates: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (dates.length < n) {
    d.setDate(d.getDate() - 1);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(new Date(d));
    }
  }
  return dates;
}

/**
 * Get ISO week number and year for a date.
 */
function getISOWeekAndYear(date: Date): { weekNumber: number; yearNumber: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return { weekNumber, yearNumber: d.getFullYear() };
}

export async function seedM09LogbookData(prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    log.info('Skipping M09 logbook seed — production environment');
    return;
  }

  log.info('Starting M09 logbook dev seed');

  // ---- Find active KP groups for seeding ----
  const activeKPGroups = await prisma.kPGroup.findMany({
    where: { status: KPGroupStatus.ACTIVE },
    take: 2,
    include: {
      coordinator: true,
      cohort: true,
    },
  });

  if (activeKPGroups.length === 0) {
    log.warn('No active KP groups found — skipping M09 logbook seed');
    return;
  }

  const weekdays = getLastNWeekdays(5);
  const prevWeekDate = weekdays[weekdays.length - 1];
  const { weekNumber, yearNumber } = getISOWeekAndYear(prevWeekDate);

  // ---- Seed KPLogDaily + KPLogWeekly per KP group ----
  for (const kpGroup of activeKPGroups) {
    const kpUserId = kpGroup.kpCoordinatorUserId;
    const orgId = kpGroup.organizationId;
    const cohortId = kpGroup.cohortId;
    const kpGroupId = kpGroup.id;

    log.info('Seeding KP logbook data', { kpUserId, kpGroupId });

    // Seed 5 KPLogDaily (last 5 weekdays)
    for (let i = 0; i < Math.min(5, weekdays.length); i++) {
      const date = weekdays[i];
      const hasRedFlag = i === 0; // First day has a red flag for testing

      await prisma.kPLogDaily.upsert({
        where: { kpUserId_date: { kpUserId, date } },
        create: {
          organizationId: orgId,
          cohortId,
          kpGroupId,
          kpUserId,
          date,
          moodAvg: 3 + (i % 3),
          suggestedMood: 3.5,
          responderCount: 8,
          totalMembers: 12,
          redFlagsObserved: hasRedFlag ? ['MENANGIS'] : [],
          anecdoteShort: hasRedFlag
            ? 'Beberapa maba terlihat lelah dan kurang bersemangat.'
            : 'Kelompok berjalan dengan baik hari ini.',
          recordedAt: new Date(date.getTime() + 17 * 3600000), // 17:00
          updatedAt: new Date(),
        },
        update: {
          moodAvg: 3 + (i % 3),
          updatedAt: new Date(),
        },
      });
    }

    log.info('Seeded KPLogDaily', { kpUserId, count: weekdays.length });

    // Seed 1 KPLogWeekly for previous week
    await prisma.kPLogWeekly.upsert({
      where: { kpUserId_weekNumber_yearNumber: { kpUserId, weekNumber, yearNumber } },
      create: {
        organizationId: orgId,
        cohortId,
        kpGroupId,
        kpUserId,
        weekNumber,
        yearNumber,
        whatWorked: 'Diskusi kelompok berjalan lancar dan semua maba hadir tepat waktu. Sesi refleksi akhir minggu memberikan insight baru bagi KP.',
        whatDidnt: 'Beberapa maba masih kesulitan mengikuti materi. Waktu pertemuan sering molor dari jadwal yang disepakati.',
        changesNeeded: 'Perlu membuat checklist harian untuk memastikan semua maba memahami materi. Jadwal pertemuan harus dikomunikasikan lebih awal.',
        avgMoodSnapshot: 3.6,
        redFlagSummary: { MENANGIS: 1, total: 1 },
        dailyCount: weekdays.length,
        contextSnapshot: {
          avgMood: 3.6,
          redFlagBreakdown: { MENANGIS: 1 },
          anecdoteList: ['Beberapa maba terlihat lelah dan kurang bersemangat.'],
          dailyCount: weekdays.length,
        },
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        avgMoodSnapshot: 3.6,
        updatedAt: new Date(),
      },
    });

    log.info('Seeded KPLogWeekly', { kpUserId, weekNumber, yearNumber });
  }

  // ---- Seed KasuhLog for active pairs ----
  const activePairs = await prisma.kasuhPair.findMany({
    where: { status: PairStatus.ACTIVE },
    take: 2,
    include: {
      kasuh: true,
      maba: true,
    },
  });

  if (activePairs.length === 0) {
    log.warn('No active KasuhPair found — skipping KasuhLog seed');
  } else {
    for (const pair of activePairs) {
      const pairCreatedAt = pair.createdAt;
      const now = new Date();
      const diffMs = now.getTime() - pairCreatedAt.getTime();
      const cycleNumber = Math.max(1, Math.floor(diffMs / (14 * 24 * 3600 * 1000)) + 1);

      await prisma.kasuhLog.upsert({
        where: { pairId_cycleNumber: { pairId: pair.id, cycleNumber } },
        create: {
          organizationId: pair.organizationId,
          cohortId: pair.cohortId,
          pairId: pair.id,
          kasuhUserId: pair.kasuhUserId,
          mabaUserId: pair.mabaUserId,
          cycleNumber,
          attendance: KasuhLogAttendance.MET,
          meetingDate: new Date(),
          reflection: 'Pertemuan berjalan baik. Adik asuh berbagi kekhawatiran tentang adaptasi di kampus dan kami mendiskusikan strategi manajemen waktu yang efektif.',
          flagUrgent: false,
          followupNotes: 'Pantau perkembangan manajemen waktu di minggu berikutnya.',
          submittedAt: new Date(),
          updatedAt: new Date(),
        },
        update: {
          updatedAt: new Date(),
        },
      });

      log.info('Seeded KasuhLog', { pairId: pair.id, cycleNumber });
    }
  }

  log.info('M09 logbook dev seed completed');
}
