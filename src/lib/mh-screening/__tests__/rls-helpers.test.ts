/**
 * src/lib/mh-screening/__tests__/rls-helpers.test.ts
 * NAWASENA M11 — Unit tests for RLS context helpers.
 *
 * Key invariants:
 * 1. withMHBypass: if recordMHAccess (audit) fails, transaction rolls back — fn is NOT called.
 * 2. withMHContext: sets session vars; fn receives tx client.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock the prisma module
vi.mock('@/utils/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

// Mock the access-log module
vi.mock('../access-log', () => ({
  recordMHAccess: vi.fn(),
}));

// We need to import after mocking
import { prisma } from '@/utils/prisma';
import { recordMHAccess } from '../access-log';
import { withMHContext, withMHBypass } from '../rls-helpers';

// Set up MH_ENCRYPTION_KEY for tests
const MOCK_KEY = 'test-encryption-key-at-least-32-chars-long-ok';

describe('withMHContext', () => {
  let mockTx: {
    $executeRawUnsafe: Mock;
    $executeRaw: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MH_ENCRYPTION_KEY = MOCK_KEY;

    mockTx = {
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
      $executeRaw: vi.fn().mockResolvedValue(undefined),
    };

    (prisma.$transaction as Mock).mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
      return fn(mockTx);
    });
  });

  it('calls the provided function with the tx client', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const result = await withMHContext({ id: 'cactor1234567890' }, fn);

    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(mockTx);
    expect(result).toBe('result');
  });

  it('sets current_user_id session variable', async () => {
    await withMHContext({ id: 'cactor1234567890' }, vi.fn().mockResolvedValue(null));

    expect(mockTx.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('app.current_user_id'),
    );
  });

  it('throws when MH_ENCRYPTION_KEY is missing', async () => {
    delete process.env.MH_ENCRYPTION_KEY;

    await expect(
      withMHContext({ id: 'cactor1234567890' }, vi.fn()),
    ).rejects.toThrow('MH_ENCRYPTION_KEY environment variable is not configured');
  });

  it('throws for invalid actor ID format', async () => {
    await expect(
      withMHContext({ id: 'invalid-id' }, vi.fn()),
    ).rejects.toThrow('Invalid actor ID format');
  });
});

describe('withMHBypass', () => {
  let mockTx: {
    $executeRawUnsafe: Mock;
    $executeRaw: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MH_ENCRYPTION_KEY = MOCK_KEY;

    mockTx = {
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
      $executeRaw: vi.fn().mockResolvedValue(undefined),
    };

    (prisma.$transaction as Mock).mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
      return fn(mockTx);
    });
  });

  it('calls fn after successful audit', async () => {
    (recordMHAccess as Mock).mockResolvedValue(undefined);
    const fn = vi.fn().mockResolvedValue('bypass-result');

    const result = await withMHBypass(
      { id: 'cactor1234567890', role: 'SUPERADMIN' },
      'key rotation',
      fn,
    );

    expect(fn).toHaveBeenCalledOnce();
    expect(result).toBe('bypass-result');
  });

  it('records BYPASS_RLS audit BEFORE setting bypass', async () => {
    (recordMHAccess as Mock).mockResolvedValue(undefined);
    const callOrder: string[] = [];

    (recordMHAccess as Mock).mockImplementation(async () => {
      callOrder.push('audit');
    });
    mockTx.$executeRawUnsafe.mockImplementation(async (sql: string) => {
      if (sql.includes('bypass_rls')) {
        callOrder.push('bypass');
      }
    });

    const fn = vi.fn().mockImplementation(async () => {
      callOrder.push('fn');
    });

    await withMHBypass({ id: 'cactor1234567890', role: 'SUPERADMIN' }, 'test', fn);

    expect(callOrder[0]).toBe('audit');
    expect(callOrder[1]).toBe('bypass');
    expect(callOrder[2]).toBe('fn');
  });

  it('does NOT call fn if audit INSERT fails (fail-closed)', async () => {
    // Simulate audit failure — transaction would roll back in real DB
    // Here we simulate the audit throwing, which prevents fn from being called
    (recordMHAccess as Mock).mockRejectedValue(new Error('Audit DB failure'));
    const fn = vi.fn().mockResolvedValue('bypass-result');

    await expect(
      withMHBypass({ id: 'cactor1234567890', role: 'SUPERADMIN' }, 'test', fn),
    ).rejects.toThrow('Audit DB failure');

    // fn should NOT have been called
    expect(fn).not.toHaveBeenCalled();
  });

  it('throws when MH_ENCRYPTION_KEY is missing', async () => {
    delete process.env.MH_ENCRYPTION_KEY;

    await expect(
      withMHBypass({ id: 'cactor1234567890', role: 'SUPERADMIN' }, 'test', vi.fn()),
    ).rejects.toThrow('MH_ENCRYPTION_KEY');
  });
});
