/**
 * prisma/seed/m04-rubric-journal-reflection.ts
 * NAWASENA M04 — Seed Rubrik JOURNAL_REFLECTION (AAC&U Integrative Learning Reflection rubric).
 *
 * M02 Rubrik model uses String rubrikKey (not enum).
 * M04 bootstraps JOURNAL_REFLECTION if not already seeded by M02.
 *
 * Idempotent: upsert by (rubrikKey, level).
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:m04-rubric');

const JOURNAL_REFLECTION_LEVELS = [
  {
    id: 'JOURNAL_REFLECTION_L1',
    rubrikKey: 'JOURNAL_REFLECTION',
    rubrikLabel: 'Journal Reflection (AAC&U)',
    level: 1,
    levelLabel: 'Benchmark',
    levelDescriptor:
      'Writes superficial reflection with no specific connection to experience. ' +
      'Describes what happened without identifying significance or personal impact.',
    applicableKegiatanIds: [],
  },
  {
    id: 'JOURNAL_REFLECTION_L2',
    rubrikKey: 'JOURNAL_REFLECTION',
    rubrikLabel: 'Journal Reflection (AAC&U)',
    level: 2,
    levelLabel: 'Milestone 2',
    levelDescriptor:
      'Begins to identify some personal reactions and draws simple connections ' +
      'between experience and learning. Reflection is somewhat specific but lacks depth.',
    applicableKegiatanIds: [],
  },
  {
    id: 'JOURNAL_REFLECTION_L3',
    rubrikKey: 'JOURNAL_REFLECTION',
    rubrikLabel: 'Journal Reflection (AAC&U)',
    level: 3,
    levelLabel: 'Milestone 3',
    levelDescriptor:
      'Connects personal experience to broader concepts, theories, or values. ' +
      'Demonstrates emerging insight into how experience shapes understanding and future behavior.',
    applicableKegiatanIds: [],
  },
  {
    id: 'JOURNAL_REFLECTION_L4',
    rubrikKey: 'JOURNAL_REFLECTION',
    rubrikLabel: 'Journal Reflection (AAC&U)',
    level: 4,
    levelLabel: 'Capstone',
    levelDescriptor:
      'Demonstrates deep integration of experience with learning. Articulates meaningful ' +
      'connections across contexts and shows actionable next steps for personal and professional growth.',
    applicableKegiatanIds: [],
  },
];

export async function seedJournalReflectionRubric(prisma: PrismaClient): Promise<void> {
  log.info('Seeding JOURNAL_REFLECTION rubric (M04)');

  for (const level of JOURNAL_REFLECTION_LEVELS) {
    await prisma.rubrik.upsert({
      where: {
        rubrikKey_level: {
          rubrikKey: level.rubrikKey,
          level: level.level,
        },
      },
      create: {
        id: level.id,
        rubrikKey: level.rubrikKey,
        rubrikLabel: level.rubrikLabel,
        level: level.level,
        levelLabel: level.levelLabel,
        levelDescriptor: level.levelDescriptor,
        applicableKegiatanIds: level.applicableKegiatanIds,
      },
      update: {
        rubrikLabel: level.rubrikLabel,
        levelLabel: level.levelLabel,
        levelDescriptor: level.levelDescriptor,
      },
    });

    log.info('Rubrik level seeded', { rubrikKey: level.rubrikKey, level: level.level, label: level.levelLabel });
  }

  log.info('JOURNAL_REFLECTION rubric seed complete', { levels: JOURNAL_REFLECTION_LEVELS.length });
}
