/**
 * src/lib/event-execution/services/capacity.service.ts
 * NAWASENA M08 — Instance capacity management.
 *
 * - raiseCapacity: increase (or remove cap) + promote waitlist users
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import { invalidateInstanceCache } from '../cache/invalidate';

const log = createLogger('event-execution:capacity-service');

export async function raiseCapacity(
  instanceId: string,
  newCapacity: number | null,
  userId: string,
  organizationId: string,
): Promise<void> {
  log.info('Raising capacity', { instanceId, newCapacity, userId });

  const instance = await prisma.kegiatanInstance.findFirst({
    where: { id: instanceId, organizationId },
    select: { id: true, status: true, capacity: true },
  });

  if (!instance) {
    throw new Error('NOT_FOUND: Instance tidak ditemukan.');
  }

  const oldCapacity = instance.capacity;

  // Validate — only allow raise, not lower (below confirmed count)
  if (newCapacity !== null && oldCapacity !== null && newCapacity < oldCapacity) {
    const confirmedCount = await prisma.rSVP.count({
      where: { instanceId, status: 'CONFIRMED' },
    });
    if (newCapacity < confirmedCount) {
      throw new Error(`VALIDATION: Kapasitas baru (${newCapacity}) lebih kecil dari jumlah terkonfirmasi (${confirmedCount}).`);
    }
  }

  await prisma.kegiatanInstance.update({
    where: { id: instanceId },
    data: {
      capacity: newCapacity,
      version: { increment: 1 },
    },
  });

  await logAudit({
    action: AuditAction.KEGIATAN_INSTANCE_CAPACITY_RAISED,
    organizationId,
    actorUserId: userId,
    entityType: 'KegiatanInstance',
    entityId: instanceId,
    beforeValue: { capacity: oldCapacity },
    afterValue: { capacity: newCapacity },
  });

  await invalidateInstanceCache(instanceId);

  // Promote waitlist users if capacity increased
  if (newCapacity === null || (oldCapacity !== null && newCapacity > oldCapacity)) {
    await promoteWaitlist(instanceId, organizationId, newCapacity);
  }

  log.info('Capacity raised', { instanceId, newCapacity });
}

async function promoteWaitlist(
  instanceId: string,
  organizationId: string,
  newCapacity: number | null,
): Promise<void> {
  try {
    // Try M06 waitlist promote helper if available
    const rsvpService = await import('@/lib/event/services/rsvp.service') as Record<string, unknown>;
    const waitlistPromote = rsvpService['waitlistPromote'];
    if (typeof waitlistPromote === 'function') {
      await waitlistPromote(instanceId, organizationId, newCapacity);
    }
  } catch (err) {
    // M06 waitlist promote not available — skip silently
    log.warn('waitlistPromote not available', { error: err });
  }
}
