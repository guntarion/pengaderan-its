/**
 * src/lib/mh-screening/__tests__/access-log.test.ts
 * NAWASENA M11 — Unit tests for MHAccessLog helper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordMHAccess } from '../access-log';

describe('recordMHAccess', () => {
  let mockTx: { mHAccessLog: { create: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    mockTx = {
      mHAccessLog: {
        create: vi.fn().mockResolvedValue({ id: 'clog1234567890' }),
      },
    };
  });

  it('calls tx.mHAccessLog.create with correct fields', async () => {
    await recordMHAccess(mockTx, {
      actorId: 'cactor1234567890',
      actorRole: 'SC',
      action: 'READ_META',
      targetType: 'MHScreening',
      targetId: 'cscreening123',
      targetUserId: 'ctargetuser123',
      organizationId: 'corg1234567890',
      reason: 'Follow-up consultation',
    });

    expect(mockTx.mHAccessLog.create).toHaveBeenCalledOnce();
    const args = mockTx.mHAccessLog.create.mock.calls[0][0];
    expect(args.data.actorId).toBe('cactor1234567890');
    expect(args.data.actorRole).toBe('SC');
    expect(args.data.action).toBe('READ_META');
    expect(args.data.targetType).toBe('MHScreening');
    expect(args.data.targetId).toBe('cscreening123');
    expect(args.data.targetUserId).toBe('ctargetuser123');
    expect(args.data.organizationId).toBe('corg1234567890');
    expect(args.data.reason).toBe('Follow-up consultation');
  });

  it('hashes the IP address before storing', async () => {
    await recordMHAccess(mockTx, {
      actorId: 'cactor1234567890',
      actorRole: 'MABA',
      action: 'CONSENT_RECORDED',
      targetType: 'MHConsentRecord',
      ip: '192.168.1.1',
    });

    const args = mockTx.mHAccessLog.create.mock.calls[0][0];
    // IP should be hashed — not plain text
    expect(args.data.ipHash).not.toBe('192.168.1.1');
    expect(args.data.ipHash).toHaveLength(64); // SHA-256 hex = 64 chars
    expect(args.data.ipHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('does not store raw IP address', async () => {
    await recordMHAccess(mockTx, {
      actorId: 'cactor1234567890',
      actorRole: 'MABA',
      action: 'CONSENT_RECORDED',
      targetType: 'MHConsentRecord',
      ip: '10.0.0.1',
    });

    const args = mockTx.mHAccessLog.create.mock.calls[0][0];
    // Should not contain the raw IP
    expect(JSON.stringify(args)).not.toContain('10.0.0.1');
  });

  it('sets ipHash to null when no IP provided', async () => {
    await recordMHAccess(mockTx, {
      actorId: 'cactor1234567890',
      actorRole: 'SC',
      action: 'DECRYPT_ANSWERS',
      targetType: 'MHScreening',
    });

    const args = mockTx.mHAccessLog.create.mock.calls[0][0];
    expect(args.data.ipHash).toBeNull();
  });

  it('truncates user agent to 200 chars', async () => {
    const longUA = 'Mozilla/5.0 '.repeat(30); // > 200 chars
    await recordMHAccess(mockTx, {
      actorId: 'cactor1234567890',
      actorRole: 'SC',
      action: 'READ_META',
      targetType: 'MHScreening',
      userAgent: longUA,
    });

    const args = mockTx.mHAccessLog.create.mock.calls[0][0];
    expect(args.data.userAgent!.length).toBeLessThanOrEqual(200);
  });

  it('sets optional fields to null when not provided', async () => {
    await recordMHAccess(mockTx, {
      actorId: 'cactor1234567890',
      actorRole: 'MABA',
      action: 'CONSENT_RECORDED',
      targetType: 'MHConsentRecord',
    });

    const args = mockTx.mHAccessLog.create.mock.calls[0][0];
    expect(args.data.targetId).toBeNull();
    expect(args.data.targetUserId).toBeNull();
    expect(args.data.organizationId).toBeNull();
    expect(args.data.reason).toBeNull();
    expect(args.data.ipHash).toBeNull();
    expect(args.data.userAgent).toBeUndefined();
    expect(args.data.metadata).toBeNull();
  });
});
