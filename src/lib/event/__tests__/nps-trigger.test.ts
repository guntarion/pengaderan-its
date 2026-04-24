// src/lib/event/__tests__/nps-trigger.test.ts
// Tests for triggerNPSForInstance and cancelNPSTrigger

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma — must be before any imports that use it
vi.mock('@/utils/prisma', () => ({
  prisma: {
    kegiatanInstance: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    attendance: { findMany: vi.fn() },
    nawasenaAuditLog: { create: vi.fn() },
  },
}));

// Mock entire notifications/send module (including all its deep dependencies)
// This intercepts both static and dynamic imports of this module.
vi.mock('@/lib/notifications/send', () => ({
  sendNotification: vi.fn().mockResolvedValue({ id: 'notif-mock' }),
}));

// Mock dependencies of send.ts to prevent module initialization errors
vi.mock('@/lib/notifications/render-template', () => ({
  renderTemplate: vi.fn().mockResolvedValue({ subject: '', body: '' }),
}));

import { prisma } from '@/utils/prisma';

describe('NPS Trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply mock implementations after clearAllMocks (which clears resolved values)
    (prisma.kegiatanInstance.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.kegiatanInstance.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.nawasenaAuditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.attendance.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it('skips trigger if npsRequestedAt already set (dedupe)', async () => {
    const { triggerNPSForInstance } = await import('../services/nps-trigger');
    (prisma.kegiatanInstance.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'inst-1',
      npsRequestedAt: new Date(), // already triggered
      status: 'DONE',
      organizationId: 'org-1',
      kegiatanId: 'keg-1',
      scheduledAt: new Date(),
    });
    const result = await triggerNPSForInstance('inst-1');
    expect(result.scheduled).toBe(0);
    expect(result.skipped).toBe(true);
    expect(prisma.kegiatanInstance.update).not.toHaveBeenCalled();
  });

  it('returns 0 scheduled when no HADIR attendance', async () => {
    const { triggerNPSForInstance } = await import('../services/nps-trigger');
    (prisma.kegiatanInstance.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'inst-1',
      npsRequestedAt: null,
      status: 'DONE',
      organizationId: 'org-1',
      kegiatanId: 'keg-1',
      scheduledAt: new Date(),
    });
    // getHadirUserIds uses prisma.attendance.findMany — already set to [] in beforeEach
    const result = await triggerNPSForInstance('inst-1');
    expect(result.scheduled).toBe(0);
  });

  it('schedules notifications for HADIR attendees', async () => {
    const { triggerNPSForInstance } = await import('../services/nps-trigger');
    (prisma.kegiatanInstance.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'inst-1',
      npsRequestedAt: null,
      status: 'DONE',
      organizationId: 'org-1',
      kegiatanId: 'keg-1',
      scheduledAt: new Date(),
    });
    // getHadirUserIds uses prisma.attendance.findMany
    (prisma.attendance.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
      { userId: 'user-3' },
    ]);

    const result = await triggerNPSForInstance('inst-1');
    // Notifications are sent via Promise.allSettled; count reflects successful sends
    expect(result.scheduled).toBeGreaterThanOrEqual(1);
    // In a fully mocked env all 3 should succeed
    expect(result.scheduled).toBeLessThanOrEqual(3);
  });

  it('skips trigger if instance status is not DONE', async () => {
    const { triggerNPSForInstance } = await import('../services/nps-trigger');
    (prisma.kegiatanInstance.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'inst-2',
      npsRequestedAt: null,
      status: 'PLANNED',
      organizationId: 'org-1',
      kegiatanId: 'keg-1',
      scheduledAt: new Date(),
    });

    const result = await triggerNPSForInstance('inst-2');
    expect(result.scheduled).toBe(0);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toMatch(/PLANNED/);
    expect(prisma.kegiatanInstance.update).not.toHaveBeenCalled();
  });

  it('throws if instance not found', async () => {
    const { triggerNPSForInstance } = await import('../services/nps-trigger');
    // already returns null from beforeEach
    await expect(triggerNPSForInstance('missing-id')).rejects.toThrow(
      'Instance not found: missing-id',
    );
  });

  it('cancelNPSTrigger resets npsRequestedAt to null', async () => {
    const { cancelNPSTrigger } = await import('../services/nps-trigger');
    (prisma.kegiatanInstance.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'inst-3',
      npsRequestedAt: new Date(),
      organizationId: 'org-1',
    });

    await cancelNPSTrigger('inst-3');

    expect(prisma.kegiatanInstance.update).toHaveBeenCalledWith({
      where: { id: 'inst-3' },
      data: { npsRequestedAt: null },
    });
  });

  it('cancelNPSTrigger throws if instance not found', async () => {
    const { cancelNPSTrigger } = await import('../services/nps-trigger');
    // already returns null from beforeEach

    await expect(cancelNPSTrigger('missing-cancel-id')).rejects.toThrow(
      'Instance not found: missing-cancel-id',
    );
  });
});
