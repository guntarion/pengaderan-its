/**
 * prisma/seed/master-data/faculty-loader.ts
 * Loads Faculty seed data from core/faculty.csv.
 * Idempotent via upsert by code (PK).
 */

import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../../src/lib/logger';
import { loadCsv } from './csv-loader';
import { facultyRowSchema } from './csv-schemas';

const log = createLogger('seed:m02:faculty');

const FACULTY_CSV = path.join(
  __dirname,
  '../../../docs/modul/02-master-data-taksonomi/seed-data/core/faculty.csv',
);

/**
 * Load and upsert 8 Faculty rows.
 * Returns { inserted, updated, skipped } counts.
 */
export async function loadFaculty(
  prisma: PrismaClient,
  isPreview: boolean = false,
): Promise<{ inserted: number; updated: number; skipped: number }> {
  log.info('Loading faculty CSV', { file: FACULTY_CSV, preview: isPreview });

  // Use loadCsv helper with core/ subdirectory
  const rows = await loadCsv('core/faculty.csv');
  log.info('Faculty CSV loaded', { rows: rows.length });

  if (rows.length === 0) {
    log.warn('Faculty CSV is empty — no rows to seed');
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  // Validate each row
  const validated = rows.map((row, idx) => {
    const result = facultyRowSchema.safeParse(row);
    if (!result.success) {
      log.error('Faculty row validation failed', {
        row: idx + 1,
        data: row,
        errors: result.error.issues,
      });
      throw new Error(
        `Faculty CSV row ${idx + 1} (code=${row.code}): ${result.error.message}`,
      );
    }
    return result.data;
  });

  if (isPreview) {
    log.info('Preview mode — showing faculty rows', {
      count: validated.length,
      codes: validated.map((r) => r.code),
    });
    return { inserted: validated.length, updated: 0, skipped: 0 };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const fac of validated) {
    const existing = await prisma.faculty.findUnique({ where: { code: fac.code } });

    await prisma.faculty.upsert({
      where: { code: fac.code },
      create: {
        code: fac.code,
        name: fac.name,
        rumpun: fac.rumpun,
        professionAssociations: fac.professionAssociations,
        notes: fac.notes ?? null,
        isActive: true,
        metadata: {},
      },
      update: {
        name: fac.name,
        rumpun: fac.rumpun,
        professionAssociations: fac.professionAssociations,
        notes: fac.notes ?? null,
        updatedAt: new Date(),
      },
    });

    if (!existing) {
      inserted++;
      log.debug('Faculty inserted', { code: fac.code, name: fac.name });
    } else {
      const changed =
        existing.name !== fac.name ||
        existing.rumpun !== fac.rumpun ||
        JSON.stringify(existing.professionAssociations.sort()) !==
          JSON.stringify(fac.professionAssociations.sort());
      if (changed) {
        updated++;
        log.debug('Faculty updated', { code: fac.code });
      } else {
        skipped++;
        log.debug('Faculty unchanged (skipped)', { code: fac.code });
      }
    }
  }

  log.info('Faculty seed complete', { inserted, updated, skipped, total: validated.length });
  return { inserted, updated, skipped };
}
