/**
 * src/lib/mh-screening/__tests__/encryption.test.ts
 * NAWASENA M11 — Unit tests for encryption SQL fragment helpers.
 *
 * Pure string tests — no DB connection needed.
 */

import { describe, it, expect } from 'vitest';
import { buildEncryptSQL, buildDecryptSQL, isSafeCuid, sanitizeActorId } from '../encryption';

describe('buildEncryptSQL', () => {
  it('returns SQL fragment with pgp_sym_encrypt', () => {
    const result = buildEncryptSQL('rawScore');
    expect(result).toBe(
      `pgp_sym_encrypt(rawScore::text, current_setting('app.mh_encryption_key'))`,
    );
  });

  it('includes the field name in the fragment', () => {
    const result = buildEncryptSQL('someField');
    expect(result).toContain('someField');
  });

  it('references the session variable for the key', () => {
    const result = buildEncryptSQL('x');
    expect(result).toContain("current_setting('app.mh_encryption_key')");
  });
});

describe('buildDecryptSQL', () => {
  it('returns SQL fragment with pgp_sym_decrypt', () => {
    const result = buildDecryptSQL('rawScoreEncrypted');
    expect(result).toBe(
      `pgp_sym_decrypt(rawScoreEncrypted, current_setting('app.mh_encryption_key'))::text`,
    );
  });

  it('includes the field name', () => {
    const result = buildDecryptSQL('answerValueEncrypted');
    expect(result).toContain('answerValueEncrypted');
  });

  it('casts to text', () => {
    const result = buildDecryptSQL('x');
    expect(result).toContain('::text');
  });
});

describe('isSafeCuid', () => {
  it('returns true for valid cuid-like strings', () => {
    expect(isSafeCuid('clh12345678901234567890')).toBe(true);
    expect(isSafeCuid('cactor1234567890')).toBe(true);
    expect(isSafeCuid('abcdefgh')).toBe(true);
  });

  it('returns false for strings with special chars', () => {
    expect(isSafeCuid('')).toBe(false);
    expect(isSafeCuid('ab')).toBe(false); // too short
    expect(isSafeCuid('123-456')).toBe(false);
    expect(isSafeCuid("'); DROP TABLE --")).toBe(false);
    expect(isSafeCuid('a' + ' '.repeat(10))).toBe(false); // spaces not allowed
  });

  it('returns false for strings starting with a digit', () => {
    expect(isSafeCuid('1c12345678901234567890')).toBe(false);
    expect(isSafeCuid('9abcdefgh')).toBe(false);
  });
});

describe('sanitizeActorId', () => {
  it('allows "system" literal', () => {
    expect(sanitizeActorId('system')).toBe('system');
  });

  it('allows valid cuid strings', () => {
    const cuid = 'clh12345678901234567890';
    expect(sanitizeActorId(cuid)).toBe(cuid);
  });

  it('throws for invalid IDs', () => {
    expect(() => sanitizeActorId("'; DROP TABLE users; --")).toThrow('Invalid actor ID format');
    expect(() => sanitizeActorId('')).toThrow('Invalid actor ID format');
    expect(() => sanitizeActorId('abc')).toThrow('Invalid actor ID format');
  });
});
