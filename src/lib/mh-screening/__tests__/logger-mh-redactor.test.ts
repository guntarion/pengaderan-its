/**
 * src/lib/mh-screening/__tests__/logger-mh-redactor.test.ts
 * NAWASENA M11 — Unit tests for MH logger redactor (allowlist-based).
 *
 * Critical test: unknown fields must be REDACTED by default.
 * Allowlisted fields (severity, instrument, etc.) must pass through.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redactMH, createMHRedactingLogger } from '../../logger-mh-redactor';
import { createLogger } from '../../logger';

type BaseLogger = ReturnType<typeof createLogger>;

describe('redactMH', () => {
  it('redacts non-allowlisted fields', () => {
    const result = redactMH({ rawScore: 15, severity: 'RED' }) as Record<string, unknown>;
    expect(result.rawScore).toBe('[REDACTED]');
    expect(result.severity).toBe('RED');
  });

  it('redacts answerValueEncrypted', () => {
    const result = redactMH({ answers: [3, 3, 3], severity: 'RED' }) as Record<string, unknown>;
    expect(result.answers).toBe('[REDACTED]');
    expect(result.severity).toBe('RED');
  });

  it('allows severity through', () => {
    const result = redactMH({ severity: 'YELLOW' }) as Record<string, unknown>;
    expect(result.severity).toBe('YELLOW');
  });

  it('allows instrument through', () => {
    const result = redactMH({ instrument: 'PHQ9' }) as Record<string, unknown>;
    expect(result.instrument).toBe('PHQ9');
  });

  it('allows phase through', () => {
    const result = redactMH({ phase: 'F1' }) as Record<string, unknown>;
    expect(result.phase).toBe('F1');
  });

  it('allows flagged and immediateContact through', () => {
    const result = redactMH({ flagged: true, immediateContact: false }) as Record<string, unknown>;
    expect(result.flagged).toBe(true);
    expect(result.immediateContact).toBe(false);
  });

  it('allows IDs through', () => {
    const result = redactMH({ screeningId: 'cscreening123', userId: 'cuser123' }) as Record<string, unknown>;
    expect(result.screeningId).toBe('cscreening123');
    expect(result.userId).toBe('cuser123');
  });

  it('recursively redacts nested objects', () => {
    const result = redactMH({
      severity: 'RED',
      nested: { rawScore: 15, severity: 'RED' },
    }) as Record<string, unknown>;
    // nested is NOT in allowlist, so the whole nested object is REDACTED
    expect(result.nested).toBe('[REDACTED]');
    expect(result.severity).toBe('RED');
  });

  it('handles null and undefined', () => {
    expect(redactMH(null)).toBeNull();
    expect(redactMH(undefined)).toBeUndefined();
  });

  it('passes through primitive values', () => {
    expect(redactMH(42)).toBe(42);
    expect(redactMH('string')).toBe('string');
    expect(redactMH(true)).toBe(true);
  });

  it('redacts arrays of objects element-by-element', () => {
    const result = redactMH([
      { severity: 'RED', rawScore: 15 },
      { severity: 'GREEN', rawScore: 3 },
    ]) as Array<Record<string, unknown>>;
    expect(result[0].severity).toBe('RED');
    expect(result[0].rawScore).toBe('[REDACTED]');
    expect(result[1].severity).toBe('GREEN');
    expect(result[1].rawScore).toBe('[REDACTED]');
  });

  it('redacts unknown fields not in allowlist', () => {
    const result = redactMH({
      unknownNewField: 'some-sensitive-value',
      anotherUnknown: 12345,
    }) as Record<string, unknown>;
    expect(result.unknownNewField).toBe('[REDACTED]');
    expect(result.anotherUnknown).toBe('[REDACTED]');
  });
});

describe('createMHRedactingLogger', () => {
  let mockBaseLogger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    child: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockBaseLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(),
    };
  });

  it('wraps info calls with redaction', () => {
    const log = createMHRedactingLogger(mockBaseLogger as unknown as BaseLogger);
    log.info('test message', { rawScore: 15, severity: 'RED' });

    expect(mockBaseLogger.info).toHaveBeenCalledWith(
      'test message',
      expect.objectContaining({
        rawScore: '[REDACTED]',
        severity: 'RED',
      }),
    );
  });

  it('wraps warn calls with redaction', () => {
    const log = createMHRedactingLogger(mockBaseLogger as unknown as BaseLogger);
    log.warn('warning', { answers: [1, 2, 3], severity: 'YELLOW' });

    expect(mockBaseLogger.warn).toHaveBeenCalledWith(
      'warning',
      expect.objectContaining({
        answers: '[REDACTED]',
        severity: 'YELLOW',
      }),
    );
  });

  it('wraps error calls with redaction', () => {
    const log = createMHRedactingLogger(mockBaseLogger as unknown as BaseLogger);
    log.error('error occurred', { resolutionNote: 'sensitive note', actorId: 'cactor123' });

    expect(mockBaseLogger.error).toHaveBeenCalledWith(
      'error occurred',
      expect.objectContaining({
        resolutionNote: '[REDACTED]',
        actorId: 'cactor123',
      }),
    );
  });

  it('handles undefined meta', () => {
    const log = createMHRedactingLogger(mockBaseLogger as unknown as BaseLogger);
    log.info('no meta');

    expect(mockBaseLogger.info).toHaveBeenCalledWith('no meta', undefined);
  });
});
