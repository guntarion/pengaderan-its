/**
 * prisma/seed/m07-sample-data.ts
 * NAWASENA M07 — Dev-only sample data for Time Capsule & Life Map.
 *
 * Guard: only runs in non-production environments.
 * Creates 3 TC entries + 6 LM goals (1 per area) + 2 M1 updates on a dummy Maba.
 *
 * Idempotent: checks for existing entries by user + cohort before creating.
 */

import {
  PrismaClient,
  LifeArea,
  LifeMapStatus,
  MilestoneKey,
} from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:m07-sample-data');

const AREAS: LifeArea[] = [
  LifeArea.PERSONAL_GROWTH,
  LifeArea.STUDI_KARIR,
  LifeArea.FINANSIAL,
  LifeArea.KESEHATAN,
  LifeArea.SOSIAL,
  LifeArea.KELUARGA,
];

const AREA_GOALS: Record<LifeArea, { goalText: string; metric: string; whyMatters: string }> = {
  [LifeArea.PERSONAL_GROWTH]: {
    goalText: 'Membangun kebiasaan membaca buku non-fiksi minimal 15 menit sehari selama F2',
    metric: 'Streak harian tercatat di aplikasi tracking; target: 80% hari dalam F2',
    whyMatters: 'Membaca memperluas wawasan dan meningkatkan kemampuan berpikir kritis yang berguna di semua aspek kehidupan',
  },
  [LifeArea.STUDI_KARIR]: {
    goalText: 'Meningkatkan IPK dari 3.20 menjadi minimal 3.50 pada semester ini',
    metric: 'IPK akhir semester minimal 3.50 sesuai transkrip resmi ITS',
    whyMatters: 'IPK yang baik membuka akses ke beasiswa, program pertukaran, dan peluang magang di perusahaan terbaik',
  },
  [LifeArea.FINANSIAL]: {
    goalText: 'Menabung minimal Rp 500.000 per bulan selama F2 untuk dana darurat',
    metric: 'Total tabungan bertambah minimal Rp 500.000/bulan, dicek via mutasi rekening',
    whyMatters: 'Dana darurat memberikan ketenangan pikiran dan kebebasan finansial saat menghadapi situasi tidak terduga',
  },
  [LifeArea.KESEHATAN]: {
    goalText: 'Berolahraga minimal 3 kali per minggu dan tidur 7-8 jam per malam secara konsisten',
    metric: 'Log olahraga 3x/minggu dan jam tidur rata-rata 7+ jam, dicatat di jurnal harian',
    whyMatters: 'Tubuh sehat adalah fondasi dari performa akademik dan sosial yang optimal selama masa kuliah',
  },
  [LifeArea.SOSIAL]: {
    goalText: 'Aktif berkontribusi dalam minimal 1 kegiatan komunitas atau organisasi per bulan',
    metric: 'Minimal 1 kegiatan/bulan dengan kontribusi nyata (panitia, peserta aktif, atau volunteer)',
    whyMatters: 'Kontribusi komunitas membangun jaringan, empati, dan skill kepemimpinan yang tidak bisa didapat di kelas',
  },
  [LifeArea.KELUARGA]: {
    goalText: 'Menghubungi keluarga (video call atau telepon) minimal 2 kali per minggu',
    metric: 'Log panggilan 2x/minggu kepada orang tua atau anggota keluarga inti',
    whyMatters: 'Menjaga hubungan dengan keluarga memberikan dukungan emosional dan mengingatkan akan nilai-nilai yang dibawa dari rumah',
  },
};

export async function seedM07SampleData(prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    log.info('Skipping M07 sample data seed in production');
    return;
  }

  log.info('Starting M07 sample data seed (dev only)');

  // Find a Maba user (first available in the system)
  const maba = await prisma.user.findFirst({
    where: { role: 'MABA' },
    select: { id: true, organizationId: true, currentCohortId: true, fullName: true },
  });

  if (!maba || !maba.currentCohortId) {
    log.warn('No Maba with currentCohortId found — skipping M07 sample data');
    return;
  }

  const { id: userId, organizationId, currentCohortId: cohortId } = maba;
  log.info('Seeding M07 sample data for Maba', { userId, mabaNama: maba.fullName });

  // ── Time Capsule Entries ──────────────────────────────────────────────────

  const existingEntries = await prisma.timeCapsuleEntry.count({
    where: { userId, cohortId },
  });

  if (existingEntries === 0) {
    const now = new Date();
    const entries = [
      {
        title: 'Hari Pertama NAWASENA',
        body: `# Hari Pertama NAWASENA\n\nAku tidak menyangka hari ini bisa sampai di sini. Sejak pertama kali menginjakkan kaki di ITS, perasaan campur aduk antara **excited** dan *nervous* terus menghantuiku.\n\nTapi melihat teman-teman baru yang punya semangat yang sama, aku jadi yakin: ini akan menjadi perjalanan yang luar biasa.\n\n> "Setiap perjalanan panjang dimulai dari satu langkah kecil."\n\nHari ini, langkah pertamaku sudah kuambil.`,
        mood: 5,
        sharedWithKasuh: true,
        publishedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        editableUntil: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Minggu Pertama — Banyak yang Baru',
        body: `# Minggu Pertama Terasa Berat\n\nJujur, minggu ini cukup melelahkan. Antara kegiatan NAWASENA, kuliah, dan adaptasi kehidupan baru sebagai mahasiswa, rasanya seperti sprint terus-menerus.\n\nAda beberapa hal yang aku pelajari minggu ini:\n- Manajemen waktu itu nyata dan penting banget\n- Teman baru bisa jadi support system yang kuat\n- Istirahat bukan kemalasan, tapi kebutuhan\n\nBesok aku mau mulai membuat jadwal yang lebih teratur. Wish me luck!`,
        mood: 3,
        sharedWithKasuh: false,
        publishedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        editableUntil: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Refleksi Dua Minggu',
        body: `# Dua Minggu: Belajar Mengenal Diri\n\nSudah dua minggu aku menjalani NAWASENA. Banyak hal yang sudah berubah — termasuk cara aku memandang diri sendiri.\n\nBeberapa insight penting:\n\n## Yang Aku Temukan\n1. **Kekuatanku**: Aku ternyata cukup baik dalam mendengarkan orang lain\n2. **Kelemahanku**: Aku masih sering menunda-nunda pekerjaan\n3. **Yang ingin aku kembangkan**: Kemampuan berbicara di depan umum\n\n## Next Steps\nAku ingin mulai journaling lebih rutin dan mulai bergabung di kegiatan komunitas yang sesuai minatku.\n\nSatu langkah sehari sudah cukup.`,
        mood: 4,
        sharedWithKasuh: true,
        publishedAt: now,
        editableUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    ];

    for (const entry of entries) {
      await prisma.timeCapsuleEntry.create({
        data: { ...entry, organizationId, cohortId, userId },
      });
    }

    log.info('Created 3 Time Capsule entries', { userId });
  } else {
    log.info('Time Capsule entries already exist, skipping', { existingEntries, userId });
  }

  // ── Life Map Goals ────────────────────────────────────────────────────────

  const existingGoals = await prisma.lifeMap.count({
    where: { userId, cohortId },
  });

  if (existingGoals === 0) {
    const now = new Date();
    const deadline = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

    const createdGoals: Array<{ id: string; area: LifeArea }> = [];

    for (const area of AREAS) {
      const goalData = AREA_GOALS[area];
      const goal = await prisma.lifeMap.create({
        data: {
          organizationId,
          cohortId,
          userId,
          area,
          ...goalData,
          deadline,
          status: LifeMapStatus.ACTIVE,
          sharedWithKasuh: area === LifeArea.PERSONAL_GROWTH || area === LifeArea.STUDI_KARIR,
        },
      });
      createdGoals.push({ id: goal.id, area: goal.area });
    }

    log.info('Created 6 Life Map goals', { userId });

    // ── Milestone M1 Updates (2 goals) ────────────────────────────────────

    const goalsForM1 = createdGoals.slice(0, 2); // first 2 goals get M1 update

    for (const goal of goalsForM1) {
      const now2 = new Date();
      await prisma.lifeMapUpdate.create({
        data: {
          organizationId,
          cohortId,
          userId,
          lifeMapId: goal.id,
          milestone: MilestoneKey.M1,
          progressText: `Sudah memulai perjalanan menuju goal di area ${goal.area}. Minggu pertama terasa berat, tapi aku mulai menemukan ritme yang pas. Sudah ada beberapa langkah kecil yang aku ambil untuk mencapai tujuan ini.`,
          progressPercent: 25,
          reflectionText: `Dari milestone M1 ini, aku belajar bahwa memulai adalah bagian yang paling sulit. Tapi setelah mulai, semuanya terasa lebih mudah. Aku perlu lebih konsisten dan tidak mudah menyerah saat menghadapi rintangan kecil.`,
          isLate: false,
          editableUntil: new Date(now2.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    log.info('Created 2 M1 milestone updates', { userId });
  } else {
    log.info('Life Map goals already exist, skipping', { existingGoals, userId });
  }

  log.info('M07 sample data seed complete', { userId });
}
