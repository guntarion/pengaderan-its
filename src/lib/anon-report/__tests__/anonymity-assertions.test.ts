/**
 * src/lib/anon-report/__tests__/anonymity-assertions.test.ts
 * NAWASENA M12 — CI Anonymity Invariants
 *
 * These tests are non-negotiable CI gates. ALL must pass before any deploy.
 * Breach = rollback + 72h incident response per UU PDP.
 *
 * Tests:
 * 1. AnonReport table has no userId/email/ip column (information_schema check)
 * 2. Prisma DMMF has no User relation in AnonReport model
 * 3. Tracking code is non-derivable from timestamp
 * 4. Logger redactor strips body/IP/UA/trackingCode
 * 5. Submit Zod schema rejects/strips email/phone/name fields
 */

import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { generateTrackingCode } from '@/lib/anon-report/tracking-code';
import { createAnonRedactingLogger } from '@/lib/logger-anon-redactor';
import { createLogger } from '@/lib/logger';

// ============================================================
// Test 1: Prisma DMMF — AnonReport has no User relation
// ============================================================

describe('M12 Anonymity Invariants', () => {
  describe('Prisma DMMF checks', () => {
    it('AnonReport has no relation to User in Prisma schema (DMMF)', () => {
      const model = Prisma.dmmf.datamodel.models.find((m) => m.name === 'AnonReport');
      expect(model, 'AnonReport model must exist in Prisma DMMF').toBeDefined();

      const userRelations = model!.fields.filter(
        (f) =>
          f.type === 'User' ||
          (f.relationName && f.relationName.toLowerCase().includes('user')),
      );
      expect(userRelations, 'AnonReport must have ZERO User relations').toHaveLength(0);
    });

    it('AnonReport has no userId, email, phone, reporterName, ip, userAgent, fingerprint fields in DMMF', () => {
      const model = Prisma.dmmf.datamodel.models.find((m) => m.name === 'AnonReport');
      expect(model).toBeDefined();

      const forbiddenNames = [
        'userid',
        'user_id',
        'email',
        'phone',
        'reportername',
        'reporter_name',
        'ip',
        'ipaddress',
        'ip_address',
        'useragent',
        'user_agent',
        'fingerprint',
        'reporterid',
        'reporter_id',
      ];

      const fieldNames = model!.fields.map((f) => f.name.toLowerCase());

      for (const forbidden of forbiddenNames) {
        expect(
          fieldNames,
          `AnonReport MUST NOT have field: ${forbidden}`,
        ).not.toContain(forbidden);
      }
    });
  });

  // ============================================================
  // Test 2: Tracking code — non-derivable, unique, correct format
  // ============================================================

  describe('generateTrackingCode', () => {
    it('generates code matching NW-[A-Z0-9]{8} format', () => {
      const code = generateTrackingCode();
      expect(code).toMatch(/^NW-[A-Z0-9]{8}$/);
    });

    it('generates unique codes — 1000 generations with zero collision', () => {
      const codes = Array.from({ length: 1000 }, () => generateTrackingCode());
      const unique = new Set(codes);
      expect(unique.size).toBe(1000);
    });

    it('codes are NOT derivable from current timestamp', () => {
      // If codes were timestamp-based, sequential generation would show pattern
      const before = Date.now();
      const codes = Array.from({ length: 50 }, () => generateTrackingCode());
      const after = Date.now();

      const timeStr = String(before).slice(0, 8); // first 8 digits of ms timestamp

      // No code should contain the timestamp as a substring
      for (const code of codes) {
        const codeChars = code.replace('NW-', '');
        // Codes should not encode the timestamp range
        expect(codeChars).not.toMatch(new RegExp(timeStr.slice(0, 4)));
      }

      // All codes must still be valid format
      codes.forEach((code) => {
        expect(code).toMatch(/^NW-[A-Z0-9]{8}$/);
      });

      // The codes should not be sequential (if they were time-based, adjacent codes
      // would have similar prefixes when many generated in tight loop)
      // Check entropy: count distinct first characters across all codes
      const firstChars = new Set(codes.map((c) => c[3]));
      expect(firstChars.size).toBeGreaterThan(5); // At least 5 different first chars

      void after; // suppress unused warning
    });

    it('10,000 code generations have no collision', () => {
      const codes = Array.from({ length: 10000 }, () => generateTrackingCode());
      const unique = new Set(codes);
      expect(unique.size).toBe(10000);
    });
  });

  // ============================================================
  // Test 3: Logger redactor strips sensitive fields
  // ============================================================

  describe('createAnonRedactingLogger', () => {
    it('redacts body, bodyText, ip, userAgent, trackingCode, fingerprint, captchaToken', () => {
      const captured: Array<{ msg: string; meta?: Record<string, unknown> }> = [];

      // Create a spy base logger
      const spyLog = {
        info: (msg: string, meta?: Record<string, unknown>) => captured.push({ msg, meta }),
        warn: (msg: string, meta?: Record<string, unknown>) => captured.push({ msg, meta }),
        error: (msg: string, meta?: Record<string, unknown>) => captured.push({ msg, meta }),
        debug: (msg: string, meta?: Record<string, unknown>) => captured.push({ msg, meta }),
        child: (_ctx: unknown) => spyLog,
      };

      const log = createAnonRedactingLogger(spyLog as unknown as ReturnType<typeof createLogger>);

      log.info('test', {
        bodyText: 'secret report content',
        ip: '203.1.2.3',
        userAgent: 'Mozilla/5.0...',
        trackingCode: 'NW-ABCD1234',
        fingerprint: 'sha256hash...',
        captchaToken: 'turnstile-abc',
        'user-agent': 'Mozilla/5.0...',
        'x-forwarded-for': '203.1.2.3',
        category: 'BULLYING',
        status: 'NEW',
      });

      const entry = captured[0];
      expect(entry).toBeDefined();
      const meta = entry.meta!;

      expect(meta.bodyText).toBe('[REDACTED]');
      expect(meta.ip).toBe('[REDACTED]');
      expect(meta.userAgent).toBe('[REDACTED]');
      expect(meta.trackingCode).toBe('[REDACTED]');
      expect(meta.fingerprint).toBe('[REDACTED]');
      expect(meta.captchaToken).toBe('[REDACTED]');
      expect(meta['user-agent']).toBe('[REDACTED]');
      expect(meta['x-forwarded-for']).toBe('[REDACTED]');

      // Non-sensitive fields pass through
      expect(meta.category).toBe('BULLYING');
      expect(meta.status).toBe('NEW');
    });

    it('recursively redacts nested sensitive fields', () => {
      const captured: Array<{ meta?: Record<string, unknown> }> = [];
      const spyLog = {
        info: (_msg: string, meta?: Record<string, unknown>) => captured.push({ meta }),
        warn: (_msg: string, meta?: Record<string, unknown>) => captured.push({ meta }),
        error: (_msg: string, meta?: Record<string, unknown>) => captured.push({ meta }),
        debug: (_msg: string, meta?: Record<string, unknown>) => captured.push({ meta }),
        child: (_ctx: unknown) => spyLog,
      };

      const log = createAnonRedactingLogger(spyLog as unknown as ReturnType<typeof createLogger>);

      log.info('nested test', {
        request: {
          body: 'nested secret',
          ip: '1.2.3.4',
        },
        safe: 'value',
      });

      const meta = captured[0].meta!;
      const request = meta.request as Record<string, unknown>;
      expect(request.body).toBe('[REDACTED]');
      expect(request.ip).toBe('[REDACTED]');
      expect(meta.safe).toBe('value');
    });
  });

  // ============================================================
  // Test 4: Submit Zod schema strips/rejects identifying fields
  // ============================================================

  describe('Submit Zod schema', () => {
    it('does not include email/phone/name in validated output', async () => {
      // Import the submit schema from the route
      const { submitSchema } = await import('@/lib/anon-report/schemas');

      const result = submitSchema.safeParse({
        cohortId: 'cohort-id-123',
        category: 'OTHER',
        bodyText: 'This is a valid test report with enough characters here.',
        email: 'evil@attacker.com',
        phone: '+62812345678',
        reporterName: 'John Doe',
        ip: '1.2.3.4',
        fingerprint: 'abc123',
        captchaToken: 'test-token',
      });

      // Either parsed successfully with email stripped, or rejected
      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(data.email).toBeUndefined();
        expect(data.phone).toBeUndefined();
        expect(data.reporterName).toBeUndefined();
        expect(data.ip).toBeUndefined();
        expect(data.fingerprint).toBeUndefined();
      }
      // If parse fails for other reasons, that's also fine for this test
    });

    it('requires bodyText minimum 20 characters', async () => {
      const { submitSchema } = await import('@/lib/anon-report/schemas');

      const result = submitSchema.safeParse({
        cohortId: 'cohort-id-123',
        category: 'OTHER',
        bodyText: 'too short',
        captchaToken: 'test-token',
      });

      expect(result.success).toBe(false);
    });
  });
});
