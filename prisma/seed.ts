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

import { PrismaClient, PaktaType, PaktaVersionStatus, OrganizationStatus, CohortStatus, UserRole, UserStatus } from '@prisma/client';
import { createLogger } from '../src/lib/logger';

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
