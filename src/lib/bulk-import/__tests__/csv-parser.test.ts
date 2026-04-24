/**
 * src/lib/bulk-import/__tests__/csv-parser.test.ts
 * Unit tests for CSV parsing + validation pipeline.
 *
 * Tests: valid rows, invalid email, invalid NRP, duplicate email in-file, cohort missing (empty).
 */

import { describe, it, expect } from 'vitest';
import { parseCsv } from '../csv-parser';
import { validateRow, checkDuplicates } from '../csv-schema';

// ---- Helpers ----

function makeCsv(rows: string[]): string {
  const header = 'email,fullName,role,cohortCode,nrp,displayName';
  return [header, ...rows].join('\n');
}

// ---- parseCsv tests ----

describe('parseCsv', () => {
  it('parses valid rows correctly', () => {
    const csv = makeCsv([
      'john@its.ac.id,John Doe,MABA,C26,1234567890,John',
      'jane@its.ac.id,Jane Smith,SC,C26,,Jane',
    ]);

    const result = parseCsv(csv);
    expect(result.headerErrors).toHaveLength(0);
    expect(result.totalRows).toBe(2);
    expect(result.validRows).toHaveLength(2);
    expect(result.errorRows).toHaveLength(0);

    const first = result.validRows[0].data!;
    expect(first.email).toBe('john@its.ac.id');
    expect(first.fullName).toBe('John Doe');
    expect(first.role).toBe('MABA');
    expect(first.cohortCode).toBe('C26');
    expect(first.nrp).toBe('1234567890');
    expect(first.displayName).toBe('John');
  });

  it('normalises email to lowercase', () => {
    const csv = makeCsv(['JOHN@ITS.AC.ID,John Doe,MABA,C26,,']);
    const result = parseCsv(csv);
    expect(result.validRows[0].data?.email).toBe('john@its.ac.id');
  });

  it('normalises role to uppercase', () => {
    const csv = makeCsv(['john@its.ac.id,John Doe,maba,C26,,']);
    const result = parseCsv(csv);
    expect(result.validRows[0].data?.role).toBe('MABA');
  });

  it('returns error for invalid email format', () => {
    const csv = makeCsv(['not-an-email,John Doe,MABA,C26,,']);
    const result = parseCsv(csv);
    expect(result.validRows).toHaveLength(0);
    expect(result.errorRows).toHaveLength(1);
    expect(result.errorRows[0].errors?.some((e) => /email/i.test(e))).toBe(true);
  });

  it('returns error for invalid NRP format (not 10 digits)', () => {
    const csv = makeCsv(['john@its.ac.id,John Doe,MABA,C26,12345,,']);
    const result = parseCsv(csv);
    expect(result.errorRows).toHaveLength(1);
    expect(result.errorRows[0].errors?.some((e) => /NRP/.test(e))).toBe(true);
  });

  it('accepts NRP with exactly 10 digits', () => {
    const csv = makeCsv(['john@its.ac.id,John Doe,MABA,C26,1234567890,']);
    const result = parseCsv(csv);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].data?.nrp).toBe('1234567890');
  });

  it('accepts empty NRP (optional)', () => {
    const csv = makeCsv(['john@its.ac.id,John Doe,MABA,C26,,']);
    const result = parseCsv(csv);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].data?.nrp).toBeUndefined();
  });

  it('returns error for invalid role', () => {
    const csv = makeCsv(['john@its.ac.id,John Doe,SUPERADMIN,C26,,']);
    const result = parseCsv(csv);
    // SUPERADMIN is not in IMPORTABLE_ROLES
    expect(result.errorRows).toHaveLength(1);
    expect(result.errorRows[0].errors?.some((e) => /role/i.test(e))).toBe(true);
  });

  it('detects duplicate email within file', () => {
    const csv = makeCsv([
      'john@its.ac.id,John Doe,MABA,C26,,',
      'john@its.ac.id,John Doe 2,SC,C26,,',
    ]);
    const result = parseCsv(csv);
    expect(result.crossRowErrors).toHaveLength(1);
    expect(result.crossRowErrors[0].field).toBe('email');
    expect(result.crossRowErrors[0].conflictsWith).toBe(2); // line 2 is first
    // Duplicate row should be in errorRows
    expect(result.errorRows.some((r) => r.lineNumber === 3)).toBe(true);
  });

  it('detects duplicate NRP within file', () => {
    const csv = makeCsv([
      'john@its.ac.id,John Doe,MABA,C26,1234567890,',
      'jane@its.ac.id,Jane Doe,MABA,C26,1234567890,',
    ]);
    const result = parseCsv(csv);
    expect(result.crossRowErrors.some((e) => e.field === 'nrp')).toBe(true);
  });

  it('returns header error when required column is missing', () => {
    const csv = 'email,fullName,role\njohn@its.ac.id,John Doe,MABA';
    // Missing cohortCode
    const result = parseCsv(csv);
    expect(result.headerErrors.length).toBeGreaterThan(0);
    expect(result.headerErrors.some((e) => /cohort/i.test(e))).toBe(true);
  });

  it('returns header error for empty file', () => {
    const csv = 'email,fullName,role,cohortCode\n';
    const result = parseCsv(csv);
    // No data rows
    expect(result.headerErrors.some((e) => /baris/i.test(e))).toBe(true);
  });

  it('correctly assigns lineNumber (header = line 1)', () => {
    const csv = makeCsv([
      'john@its.ac.id,John Doe,MABA,C26,,', // line 2
      'jane@its.ac.id,Jane Doe,SC,C26,,',   // line 3
    ]);
    const result = parseCsv(csv);
    expect(result.validRows[0].lineNumber).toBe(2);
    expect(result.validRows[1].lineNumber).toBe(3);
  });

  it('accepts alternative header casing for fullName', () => {
    const csv = 'email,fullname,role,cohortcode\njohn@its.ac.id,John Doe,MABA,C26';
    const result = parseCsv(csv);
    expect(result.headerErrors).toHaveLength(0);
    expect(result.validRows[0].data?.fullName).toBe('John Doe');
  });
});

// ---- validateRow tests ----

describe('validateRow', () => {
  it('returns isValid=true for a correct row', () => {
    const raw = {
      email: 'user@its.ac.id',
      fullName: 'User Name',
      role: 'MABA',
      cohortCode: 'C26',
    };
    const result = validateRow(raw, 2);
    expect(result.isValid).toBe(true);
    expect(result.data?.email).toBe('user@its.ac.id');
  });

  it('returns isValid=false with errors for missing fullName', () => {
    const raw = { email: 'user@its.ac.id', fullName: '', role: 'MABA', cohortCode: 'C26' };
    const result = validateRow(raw, 2);
    expect(result.isValid).toBe(false);
    expect(result.errors?.some((e) => /nama lengkap/i.test(e))).toBe(true);
  });

  it('returns isValid=false for missing cohortCode', () => {
    const raw = { email: 'user@its.ac.id', fullName: 'User Name', role: 'MABA', cohortCode: '' };
    const result = validateRow(raw, 2);
    expect(result.isValid).toBe(false);
    expect(result.errors?.some((e) => /cohort/i.test(e))).toBe(true);
  });
});

// ---- checkDuplicates tests ----

describe('checkDuplicates', () => {
  it('finds no duplicates in unique emails', () => {
    const rows = [
      validateRow({ email: 'alice@its.ac.id', fullName: 'Alice Doe', role: 'MABA', cohortCode: 'C26' }, 2),
      validateRow({ email: 'bob@its.ac.id', fullName: 'Bob Smith', role: 'MABA', cohortCode: 'C26' }, 3),
    ];
    expect(checkDuplicates(rows)).toHaveLength(0);
  });

  it('flags second occurrence of duplicate email', () => {
    const rows = [
      validateRow({ email: 'dup@its.ac.id', fullName: 'Alice Doe', role: 'MABA', cohortCode: 'C26' }, 2),
      validateRow({ email: 'dup@its.ac.id', fullName: 'Bob Smith', role: 'MABA', cohortCode: 'C26' }, 3),
    ];
    const errors = checkDuplicates(rows);
    expect(errors).toHaveLength(1);
    expect(errors[0].lineNumber).toBe(3);
    expect(errors[0].conflictsWith).toBe(2);
  });
});
