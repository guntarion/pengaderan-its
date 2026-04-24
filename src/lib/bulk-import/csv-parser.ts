/**
 * src/lib/bulk-import/csv-parser.ts
 * Parse a CSV Buffer/string into validated + deduplicated rows.
 *
 * Uses papaparse for CSV parsing.
 * Returns { validRows, errorRows } after per-row + cross-row validation.
 *
 * File size limit: 2 MB (enforced by caller / multipart middleware).
 * Row limit: 500 rows per upload.
 */

import Papa from 'papaparse';
import { createLogger } from '@/lib/logger';
import {
  validateRow,
  checkDuplicates,
  type ValidatedRow,
  type CrossRowError,
  type RawCsvRow,
} from './csv-schema';

const log = createLogger('csv-parser');

export const CSV_MAX_ROWS = 500;
export const CSV_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

// Required CSV column headers (case-insensitive)
const REQUIRED_HEADERS = ['email', 'fullname', 'role', 'cohortcode'] as const;

export interface ParseResult {
  validRows: ValidatedRow[];
  errorRows: ValidatedRow[];
  crossRowErrors: CrossRowError[];
  totalRows: number;
  /** Missing or unrecognised header columns */
  headerErrors: string[];
}

/**
 * Normalise CSV header to lowercase camelCase key.
 * Handles common variations: fullname → fullName, cohortcode → cohortCode, etc.
 */
function normaliseHeader(header: string): string {
  const map: Record<string, string> = {
    email: 'email',
    nrp: 'nrp',
    fullname: 'fullName',
    full_name: 'fullName',
    'full name': 'fullName',
    displayname: 'displayName',
    display_name: 'displayName',
    'display name': 'displayName',
    panggilan: 'displayName',
    role: 'role',
    peran: 'role',
    cohortcode: 'cohortCode',
    cohort_code: 'cohortCode',
    'cohort code': 'cohortCode',
    kodecohort: 'cohortCode',
    kode_cohort: 'cohortCode',
    angkatan: 'cohortCode',
  };

  const lower = header.toLowerCase().trim();
  return map[lower] ?? lower.replace(/[_\s]([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Parse CSV content (Buffer or string) and return validated rows.
 */
export function parseCsv(input: Buffer | string): ParseResult {
  const content = Buffer.isBuffer(input) ? input.toString('utf-8') : input;

  log.info('Starting CSV parse', { bytes: content.length });

  // Parse with PapaParse
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normaliseHeader,
    transform: (value: string) => value.trim(),
  });

  // Check header errors
  const headerErrors: string[] = [];
  const actualHeaders = parsed.meta.fields ?? [];

  for (const required of REQUIRED_HEADERS) {
    // Map required back to normalised form
    const normRequired = normaliseHeader(required);
    if (!actualHeaders.includes(normRequired)) {
      const friendlyName =
        normRequired === 'fullName'
          ? 'fullName'
          : normRequired === 'cohortCode'
            ? 'cohortCode'
            : normRequired;
      headerErrors.push(`Kolom wajib tidak ditemukan: "${friendlyName}"`);
    }
  }

  if (headerErrors.length > 0) {
    log.warn('CSV header validation failed', { headerErrors });
    return {
      validRows: [],
      errorRows: [],
      crossRowErrors: [],
      totalRows: 0,
      headerErrors,
    };
  }

  const rows = parsed.data as RawCsvRow[];
  const totalRows = rows.length;

  if (totalRows === 0) {
    return {
      validRows: [],
      errorRows: [],
      crossRowErrors: [],
      totalRows: 0,
      headerErrors: ['File CSV tidak memiliki baris data'],
    };
  }

  if (totalRows > CSV_MAX_ROWS) {
    return {
      validRows: [],
      errorRows: [],
      crossRowErrors: [],
      totalRows,
      headerErrors: [
        `File CSV melebihi batas ${CSV_MAX_ROWS} baris (ditemukan ${totalRows} baris). Bagi menjadi beberapa file.`,
      ],
    };
  }

  // Per-row validation (line 2 = first data row because line 1 = header)
  const validRows: ValidatedRow[] = [];
  const errorRows: ValidatedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const lineNumber = i + 2; // 1-based, header at line 1
    const result = validateRow(rows[i], lineNumber);
    if (result.isValid) {
      validRows.push(result);
    } else {
      errorRows.push(result);
    }
  }

  // Cross-row deduplication check (email + NRP uniqueness within file)
  const crossRowErrors = checkDuplicates(validRows);

  // Move rows that have cross-row errors into errorRows
  if (crossRowErrors.length > 0) {
    const moveToError: ValidatedRow[] = [];

    for (const row of validRows) {
      const errs = crossRowErrors.filter((e) => e.lineNumber === row.lineNumber);
      if (errs.length > 0) {
        moveToError.push({
          ...row,
          isValid: false,
          errors: errs.map((e) => e.message),
        });
      }
    }

    // Remove from validRows, add to errorRows
    for (const row of moveToError) {
      const idx = validRows.findIndex((r) => r.lineNumber === row.lineNumber);
      if (idx !== -1) validRows.splice(idx, 1);
      errorRows.push(row);
    }
  }

  log.info('CSV parse complete', {
    totalRows,
    validRows: validRows.length,
    errorRows: errorRows.length,
    crossRowErrors: crossRowErrors.length,
  });

  return {
    validRows,
    errorRows,
    crossRowErrors,
    totalRows,
    headerErrors: [],
  };
}
