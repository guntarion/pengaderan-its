/**
 * src/lib/bulk-import/csv-schema.ts
 * Zod schema for bulk user import CSV rows.
 *
 * Expected CSV columns (case-insensitive headers):
 *   email, nrp, fullName, displayName, role, cohortCode
 *
 * Cross-row validation (after per-row validation):
 *   - email must be unique within the file
 *   - nrp must be unique within the file (when provided)
 */

import { z } from 'zod';

// All valid NAWASENA roles that can be assigned via bulk import
// SUPERADMIN is excluded — must be assigned manually
export const IMPORTABLE_ROLES = [
  'MABA',
  'KP',
  'KASUH',
  'OC',
  'ELDER',
  'SC',
  'PEMBINA',
  'BLM',
  'SATGAS',
  'ALUMNI',
  'DOSEN_WALI',
] as const;

export type ImportableRole = (typeof IMPORTABLE_ROLES)[number];

/**
 * Per-row Zod schema.
 * All string fields are trimmed automatically.
 */
export const csvRowSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .transform((v) => v.toLowerCase().trim()),

  nrp: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim() : undefined))
    .refine((v) => !v || /^\d{10}$/.test(v), {
      message: 'NRP harus berupa 10 digit angka',
    }),

  fullName: z
    .string()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(200, 'Nama lengkap maksimal 200 karakter')
    .transform((v) => v.trim()),

  displayName: z
    .string()
    .max(100, 'Nama panggilan maksimal 100 karakter')
    .optional()
    .transform((v) => (v ? v.trim() : undefined)),

  role: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(
      z.enum(IMPORTABLE_ROLES as unknown as [string, ...string[]], {
        errorMap: () => ({
          message: `Role tidak valid. Pilih dari: ${IMPORTABLE_ROLES.join(', ')}`,
        }),
      })
    ),

  cohortCode: z
    .string()
    .min(1, 'Kode cohort wajib diisi')
    .transform((v) => v.trim().toUpperCase()),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

/**
 * Raw CSV row before validation (all strings from the CSV parser).
 */
export interface RawCsvRow {
  email?: string;
  nrp?: string;
  fullName?: string;
  displayName?: string;
  role?: string;
  cohortCode?: string;
  [key: string]: string | undefined;
}

/**
 * Result of validating a single CSV row.
 */
export interface ValidatedRow {
  lineNumber: number; // 1-based (header is line 1, first data row is line 2)
  raw: RawCsvRow;
  data?: CsvRow; // present if valid
  errors?: string[]; // present if invalid
  isValid: boolean;
}

/**
 * Result after cross-row deduplication check.
 * Applied to validRows from parseResult to detect intra-file duplicates.
 */
export interface CrossRowError {
  lineNumber: number;
  field: 'email' | 'nrp';
  value: string;
  conflictsWith: number; // lineNumber of first occurrence
  message: string;
}

/**
 * Validate a single raw row against csvRowSchema.
 */
export function validateRow(raw: RawCsvRow, lineNumber: number): ValidatedRow {
  const result = csvRowSchema.safeParse(raw);
  if (result.success) {
    return { lineNumber, raw, data: result.data, isValid: true };
  }

  const errors = result.error.errors.map((e) => {
    const field = e.path.join('.') || 'row';
    return `${field}: ${e.message}`;
  });

  return { lineNumber, raw, errors, isValid: false };
}

/**
 * Decision for existing users found during preview.
 * SKIP: skip this row (do not update existing user)
 * UPDATE: update existing user fields (role, cohort, fullName)
 */
export type ImportDecision = 'SKIP' | 'UPDATE';

/**
 * Cross-row deduplication check.
 * Returns list of duplicate violations found.
 */
export function checkDuplicates(validRows: ValidatedRow[]): CrossRowError[] {
  const emailSeen = new Map<string, number>(); // email → first lineNumber
  const nrpSeen = new Map<string, number>(); // nrp → first lineNumber
  const crossErrors: CrossRowError[] = [];

  for (const row of validRows) {
    if (!row.isValid || !row.data) continue;

    const { email, nrp } = row.data;

    // Check email duplicate
    const firstEmailLine = emailSeen.get(email);
    if (firstEmailLine !== undefined) {
      crossErrors.push({
        lineNumber: row.lineNumber,
        field: 'email',
        value: email,
        conflictsWith: firstEmailLine,
        message: `Email "${email}" sudah ada di baris ${firstEmailLine}`,
      });
    } else {
      emailSeen.set(email, row.lineNumber);
    }

    // Check NRP duplicate (only when provided)
    if (nrp) {
      const firstNrpLine = nrpSeen.get(nrp);
      if (firstNrpLine !== undefined) {
        crossErrors.push({
          lineNumber: row.lineNumber,
          field: 'nrp',
          value: nrp,
          conflictsWith: firstNrpLine,
          message: `NRP "${nrp}" sudah ada di baris ${firstNrpLine}`,
        });
      } else {
        nrpSeen.set(nrp, row.lineNumber);
      }
    }
  }

  return crossErrors;
}
