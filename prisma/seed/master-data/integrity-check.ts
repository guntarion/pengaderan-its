/**
 * prisma/seed/master-data/integrity-check.ts
 * Cross-CSV referential integrity validation before upsert.
 */

import { createLogger } from '../../../src/lib/logger';
import type {
  KegiatanMasterRow,
  TujuanRow,
  KpiDefRow,
  AnchorRefRow,
  PassportItemRow,
  RubrikRow,
} from './csv-schemas';

const log = createLogger('seed:integrity-check');

interface ParsedCsvs {
  kegiatan: KegiatanMasterRow[];
  tujuan: TujuanRow[];
  kpiDef: KpiDefRow[];
  anchorRef: AnchorRefRow[];
  passportItem: PassportItemRow[];
  rubrik: RubrikRow[];
}

interface IntegrityResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCrossReferences(parsed: ParsedCsvs): IntegrityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build set of valid kegiatan IDs from CSV
  const kegiatanIds = new Set(parsed.kegiatan.map((k) => k.id));

  log.info('Running cross-reference validation', {
    kegiatanCount: kegiatanIds.size,
  });

  // Validate Tujuan.kegiatan_id
  for (const row of parsed.tujuan) {
    if (!kegiatanIds.has(row.kegiatan_id)) {
      errors.push(
        `Tujuan '${row.id}' references kegiatan_id='${row.kegiatan_id}' not found in kegiatan_master.csv`,
      );
    }
  }

  // Validate KPIDef.kegiatan_id
  for (const row of parsed.kpiDef) {
    if (!kegiatanIds.has(row.kegiatan_id)) {
      errors.push(
        `KPIDef '${row.id}' references kegiatan_id='${row.kegiatan_id}' not found in kegiatan_master.csv`,
      );
    }
  }

  // Validate AnchorRef.kegiatan_id
  for (const row of parsed.anchorRef) {
    if (!kegiatanIds.has(row.kegiatan_id)) {
      errors.push(
        `AnchorRef '${row.id}' references kegiatan_id='${row.kegiatan_id}' not found in kegiatan_master.csv`,
      );
    }
  }

  // Validate PassportItem.kegiatan_id (optional — warning if set but not found)
  for (const row of parsed.passportItem) {
    if (row.kegiatan_id && !kegiatanIds.has(row.kegiatan_id)) {
      errors.push(
        `PassportItem '${row.id}' references kegiatan_id='${row.kegiatan_id}' not found in kegiatan_master.csv`,
      );
    }
  }

  // Validate Rubrik.applicable_kegiatan IDs
  for (const row of parsed.rubrik) {
    for (const kId of row.applicable_kegiatan) {
      if (!kegiatanIds.has(kId)) {
        warnings.push(
          `Rubrik '${row.rubrik_key}' L${row.level} references applicable_kegiatan='${kId}' not found in kegiatan_master.csv`,
        );
      }
    }
  }

  // Validate Kegiatan.prasyarat IDs (self-referential)
  for (const row of parsed.kegiatan) {
    for (const prasyaratId of row.prasyarat) {
      if (!kegiatanIds.has(prasyaratId)) {
        errors.push(
          `Kegiatan '${row.id}' has prasyarat='${prasyaratId}' not found in kegiatan_master.csv`,
        );
      }
    }
  }

  if (errors.length > 0) {
    log.error('Integrity check failed', { errorCount: errors.length });
    for (const err of errors) {
      log.error(`  - ${err}`);
    }
  }

  if (warnings.length > 0) {
    log.warn('Integrity check warnings', { warningCount: warnings.length });
    for (const warn of warnings) {
      log.warn(`  - ${warn}`);
    }
  }

  if (errors.length === 0) {
    log.info('Integrity check passed');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
