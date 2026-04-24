/**
 * prisma/seed.ts
 * NAWASENA M01 — Bootstrap seed data.
 *
 * Provisions:
 * 1. Organization HMTC (default tenant)
 * 2. SUPERADMIN user (from env SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_NAME)
 * 3. PaktaVersion v1 drafts for all 3 types
 * 4. Cohort C26 NAWASENA 2026 (draft)
 *
 * Idempotent: uses upsert by unique key — safe to run multiple times.
 *
 * Environment variables:
 *   SEED_SUPERADMIN_EMAIL  — email for bootstrap SUPERADMIN (default: guntarion@gmail.com)
 *   SEED_SUPERADMIN_NAME   — display name (default: NAWASENA Admin)
 *   TENANT_ORG_CODE        — default org code (default: HMTC)
 */

import { PrismaClient, PaktaType, PaktaVersionStatus, OrganizationStatus, CohortStatus, UserRole, UserStatus, KPGroupStatus, PairStatus, PairingRequestStatus, PairingRequestType } from '@prisma/client';
import { createLogger } from '../src/lib/logger';
import { seedNotificationTemplates } from './seed/notifications-templates';
import { seedNotificationRules } from './seed/notifications-rules';
import { seedNotificationPreferences } from './seed/notifications-preferences';
import { seedJournalReflectionRubric } from './seed/m04-rubric-journal-reflection';
import { seedM05SampleData } from './seed/m05-sample-data';
import { seedEventInstanceSampleData } from './seed/event-instance-sample';
import { seedM07NotificationTemplates } from './seed/m07-notification-templates';
import { seedM07SampleData } from './seed/m07-sample-data';
import { seedM09LogbookData } from './seed/m09-logbook';
import { seedM09NotificationRules } from './seed/m09-notification-rules';
import { seedEventExecutionSampleData } from './seed/event-execution-sample';
import { seedM10SafeguardData, seedM10SampleData } from './seed/m10-safeguard';
import { seedMHNotificationTemplates } from './seed/mh-notification-templates';

const log = createLogger('seed');
const prisma = new PrismaClient();

// ---- Config from env ----
const SUPERADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL ?? 'guntarion@gmail.com';
const SUPERADMIN_NAME = process.env.SEED_SUPERADMIN_NAME ?? 'NAWASENA Admin';
const TENANT_ORG_CODE = process.env.TENANT_ORG_CODE ?? 'HMTC';

// ---- Placeholder quiz questions (SC must replace before publishing) ----
const PLACEHOLDER_QUIZ = {
  questions: [
    {
      id: 'q1',
      question: '[PLACEHOLDER] Pertanyaan 1 — SC harus mengisi sebelum publish',
      options: [
        { id: 'a', label: 'Jawaban A' },
        { id: 'b', label: 'Jawaban B' },
        { id: 'c', label: 'Jawaban C' },
        { id: 'd', label: 'Jawaban D' },
      ],
      correctAnswerIds: ['a'],
    },
    {
      id: 'q2',
      question: '[PLACEHOLDER] Pertanyaan 2 — SC harus mengisi sebelum publish',
      options: [
        { id: 'a', label: 'Jawaban A' },
        { id: 'b', label: 'Jawaban B' },
        { id: 'c', label: 'Jawaban C' },
        { id: 'd', label: 'Jawaban D' },
      ],
      correctAnswerIds: ['b'],
    },
    {
      id: 'q3',
      question: '[PLACEHOLDER] Pertanyaan 3 — SC harus mengisi sebelum publish',
      options: [
        { id: 'a', label: 'Jawaban A' },
        { id: 'b', label: 'Jawaban B' },
        { id: 'c', label: 'Jawaban C' },
        { id: 'd', label: 'Jawaban D' },
      ],
      correctAnswerIds: ['c'],
    },
    {
      id: 'q4',
      question: '[PLACEHOLDER] Pertanyaan 4 — SC harus mengisi sebelum publish',
      options: [
        { id: 'a', label: 'Jawaban A' },
        { id: 'b', label: 'Jawaban B' },
        { id: 'c', label: 'Jawaban C' },
        { id: 'd', label: 'Jawaban D' },
      ],
      correctAnswerIds: ['d'],
    },
    {
      id: 'q5',
      question: '[PLACEHOLDER] Pertanyaan 5 — SC harus mengisi sebelum publish',
      options: [
        { id: 'a', label: 'Jawaban A' },
        { id: 'b', label: 'Jawaban B' },
        { id: 'c', label: 'Jawaban C' },
        { id: 'd', label: 'Jawaban D' },
      ],
      correctAnswerIds: ['a'],
    },
  ],
};

const PLACEHOLDER_CONTENT = (type: string) =>
  `# ${type} v1 — PLACEHOLDER\n\n` +
  `Konten ${type} versi 1 akan diisi oleh SC sebelum go-live.\n\n` +
  `## Penting\n\nSC wajib memperbarui konten ini dan pertanyaan kuis sebelum mempublikasikan versi ini.\n\n` +
  `Silakan akses admin panel di /admin/pakta untuk mengedit dan menerbitkan dokumen ini.`;

async function main() {
  log.info('Starting NAWASENA M01 seed', {
    orgCode: TENANT_ORG_CODE,
    adminEmail: SUPERADMIN_EMAIL,
  });

  // ========================================
  // 1. Upsert Organization HMTC
  // ========================================
  log.info('Upserting Organization', { code: TENANT_ORG_CODE });

  const org = await prisma.organization.upsert({
    where: { code: TENANT_ORG_CODE },
    create: {
      code: TENANT_ORG_CODE,
      name: 'Himpunan Mahasiswa Teknik Computer-Talk ITS',
      fullName: 'Himpunan Mahasiswa Teknik Komputer Institut Teknologi Sepuluh Nopember',
      facultyCode: 'FTEIC',
      contactEmail: 'hmtc@its.ac.id',
      status: OrganizationStatus.ACTIVE,
    },
    update: {
      // Do not overwrite name if already set — only update status if needed
      status: OrganizationStatus.ACTIVE,
    },
  });

  log.info('Organization ready', { id: org.id, code: org.code });

  // ========================================
  // 2. Upsert SUPERADMIN user
  // ========================================
  log.info('Upserting SUPERADMIN user', { email: SUPERADMIN_EMAIL });

  const superAdmin = await prisma.user.upsert({
    where: { email: SUPERADMIN_EMAIL },
    create: {
      email: SUPERADMIN_EMAIL,
      fullName: SUPERADMIN_NAME,
      displayName: 'Admin',
      organizationId: org.id,
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
      sessionEpoch: 0,
    },
    update: {
      // Ensure role stays SUPERADMIN on re-seed
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
      // Update org reference to current org
      organizationId: org.id,
    },
  });

  log.info('SUPERADMIN ready', { id: superAdmin.id, email: superAdmin.email });

  // ========================================
  // 3. Upsert Cohort C26 (NAWASENA 2026)
  // ========================================
  log.info('Upserting Cohort C26');

  // Check if cohort already exists
  const existingCohort = await prisma.cohort.findUnique({
    where: { organizationId_code: { organizationId: org.id, code: 'C26' } },
  });

  const cohort = existingCohort ?? await prisma.cohort.create({
    data: {
      organizationId: org.id,
      code: 'C26',
      name: 'NAWASENA 2026',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-12-31'),
      status: CohortStatus.DRAFT,
      isActive: false,
      createdBy: superAdmin.id,
    },
  });

  log.info('Cohort ready', { id: cohort.id, code: cohort.code, status: cohort.status });

  // ========================================
  // 4. Upsert PaktaVersion drafts (1 per type)
  // ========================================
  const paktaTypes: PaktaType[] = [
    PaktaType.PAKTA_PANITIA,
    PaktaType.SOCIAL_CONTRACT_MABA,
    PaktaType.PAKTA_PENGADER_2027,
  ];

  const paktaLabels: Record<PaktaType, string> = {
    PAKTA_PANITIA: 'Pakta Panitia',
    SOCIAL_CONTRACT_MABA: 'Social Contract MABA',
    PAKTA_PENGADER_2027: 'Pakta Pengader 2027',
  };

  for (const paktaType of paktaTypes) {
    log.info('Upserting PaktaVersion', { type: paktaType });

    const existing = await prisma.paktaVersion.findUnique({
      where: {
        organizationId_type_versionNumber: {
          organizationId: org.id,
          type: paktaType,
          versionNumber: 1,
        },
      },
    });

    if (!existing) {
      await prisma.paktaVersion.create({
        data: {
          organizationId: org.id,
          type: paktaType,
          versionNumber: 1,
          title: `${paktaLabels[paktaType]} NAWASENA 2026 HMTC v1`,
          contentMarkdown: PLACEHOLDER_CONTENT(paktaLabels[paktaType]),
          quizQuestions: PLACEHOLDER_QUIZ,
          passingScore: 80,
          effectiveFrom: new Date('2026-03-01'),
          status: PaktaVersionStatus.DRAFT,
        },
      });
      log.info('PaktaVersion created', { type: paktaType, version: 1 });
    } else {
      log.info('PaktaVersion already exists, skipping', { type: paktaType, id: existing.id });
    }
  }

  // ========================================
  // 5. M15: Notification Templates + Rules + Preferences
  // ========================================
  log.info('Starting M15 notifications seed');

  await seedNotificationTemplates(prisma, superAdmin.id);
  await seedNotificationRules(prisma, superAdmin.id);
  await seedNotificationPreferences(prisma);

  // ========================================
  // 5b. M04: JOURNAL_REFLECTION rubric seed
  // ========================================
  log.info('Starting M04 rubric seed');
  await seedJournalReflectionRubric(prisma);

  // ========================================
  // 6. M03: Dev fixture (gate: SEED_DEV_STRUKTUR=true)
  // ========================================
  if (process.env.NODE_ENV === 'development' && process.env.SEED_DEV_STRUKTUR === 'true') {
    const seedLog = createLogger('seed:struktur');
    seedLog.info('Starting M03 dev fixture seed');

    // Find or use superAdmin as KP coordinator placeholder
    const devKP = await prisma.user.findFirst({
      where: { organizationId: org.id, role: UserRole.KP },
    });

    const coordinatorId = devKP?.id ?? superAdmin.id;

    // Upsert KPGroup KP-A
    const existingKPGroup = await prisma.kPGroup.findFirst({
      where: { cohortId: cohort.id, code: 'KP-A' },
    });

    const kpGroup = existingKPGroup ?? await prisma.kPGroup.create({
      data: {
        organizationId: org.id,
        cohortId: cohort.id,
        code: 'KP-A',
        name: 'KP-A Dev Group',
        kpCoordinatorUserId: coordinatorId,
        assistantUserIds: [],
        capacityTarget: 12,
        capacityMax: 15,
        status: KPGroupStatus.DRAFT,
        createdBy: superAdmin.id,
      },
    });

    seedLog.info('KPGroup dev fixture ready', { id: kpGroup.id, code: kpGroup.code });

    // Seed 1 BuddyPair dev fixture (without members to keep simple)
    const existingBuddyPair = await prisma.buddyPair.findFirst({
      where: { cohortId: cohort.id, algorithmSeed: 'dev-seed-001' },
    });

    const buddyPair = existingBuddyPair ?? await prisma.buddyPair.create({
      data: {
        organizationId: org.id,
        cohortId: cohort.id,
        reasonForPairing: 'dev-fixture placeholder',
        isCrossDemographic: true,
        algorithmVersion: 'v1.0-greedy-swap',
        algorithmSeed: 'dev-seed-001',
        isTriple: false,
        status: PairStatus.ACTIVE,
        createdBy: superAdmin.id,
      },
    });

    seedLog.info('BuddyPair dev fixture ready', { id: buddyPair.id });

    // Seed 1 PairingRequest PENDING (with superAdmin as requester — dev placeholder)
    const existingRequest = await prisma.pairingRequest.findFirst({
      where: {
        cohortId: cohort.id,
        requesterUserId: superAdmin.id,
        type: PairingRequestType.RE_PAIR_KASUH,
        status: PairingRequestStatus.PENDING,
      },
    });

    if (!existingRequest) {
      await prisma.pairingRequest.create({
        data: {
          organizationId: org.id,
          cohortId: cohort.id,
          requesterUserId: superAdmin.id,
          type: PairingRequestType.RE_PAIR_KASUH,
          status: PairingRequestStatus.PENDING,
          optionalNote: 'Dev fixture — request for testing SC queue UI',
        },
      });
      seedLog.info('PairingRequest dev fixture created');
    } else {
      seedLog.info('PairingRequest dev fixture already exists, skipping');
    }

    seedLog.info('M03 dev fixture seed completed');
  }

  // ========================================
  // 7. M05: Passport Digital sample data (dev only)
  // ========================================
  if (process.env.NODE_ENV !== 'production') {
    log.info('Starting M05 passport sample data seed');
    await seedM05SampleData(prisma);
  }

  // ========================================
  // 8. M06: Event Instance sample data (dev only)
  // ========================================
  if (process.env.NODE_ENV !== 'production') {
    log.info('Starting M06 event instance sample data seed');
    await seedEventInstanceSampleData(prisma);
  }

  // ========================================
  // 9. M07: Time Capsule & Life Map notification templates
  // ========================================
  log.info('Starting M07 notification templates seed');
  await seedM07NotificationTemplates(prisma, superAdmin.id);

  // ========================================
  // 10. M07: Time Capsule & Life Map sample data (dev only)
  // ========================================
  if (process.env.NODE_ENV !== 'production') {
    log.info('Starting M07 Time Capsule & Life Map sample data seed');
    await seedM07SampleData(prisma);
  }

  // ========================================
  // 11. M09: KP & Kasuh Logbook sample data (dev only)
  // ========================================
  if (process.env.NODE_ENV !== 'production') {
    log.info('Starting M09 logbook sample data seed');
    await seedM09LogbookData(prisma);
  }

  // ========================================
  // 11b. M09: Notification rules (always)
  // ========================================
  log.info('Starting M09 notification rules seed');
  await seedM09NotificationRules(prisma, superAdmin.id);

  // ========================================
  // 12. M08: Event Execution sample data (dev only)
  // ========================================
  if (process.env.NODE_ENV !== 'production') {
    log.info('Starting M08 event execution sample data seed');
    await seedEventExecutionSampleData(prisma);
  }

  // ========================================
  // 13. M10: Safeguard notification templates + rules (always)
  // ========================================
  log.info('Starting M10 safeguard notification templates seed');
  await seedM10SafeguardData(prisma, superAdmin.id);

  // ========================================
  // 13b. M10: Safeguard sample incidents (dev only)
  // ========================================
  if (process.env.NODE_ENV !== 'production') {
    log.info('Starting M10 safeguard sample data seed');
    await seedM10SampleData(prisma);
  }

  // ========================================
  // 14. M11: Mental Health Screening notification templates
  // ========================================
  log.info('Starting M11 mental health notification templates seed');
  await seedMHNotificationTemplates(prisma, superAdmin.id);

  // ========================================
  // Summary
  // ========================================
  log.info('Seed completed successfully', {
    organization: { id: org.id, code: org.code },
    superAdmin: { id: superAdmin.id, email: superAdmin.email },
    cohort: { id: cohort.id, code: cohort.code },
    paktaVersionsSeeded: paktaTypes.length,
  });
}

main()
  .catch((err) => {
    log.error('Seed failed', { error: err });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
