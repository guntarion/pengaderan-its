/**
 * src/lib/event/services/rsvp.service.ts
 * NAWASENA M06 — RSVP management service.
 *
 * Critical: DECLINE + waitlist promote uses pg_advisory_xact_lock + Serializable isolation
 * to prevent concurrent double-promotion race conditions.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { checkRSVPRateLimit } from '@/lib/event/rate-limit';
import { invalidateInstanceCache } from '@/lib/event/cache/invalidate';
import type { RSVPStatus } from '@prisma/client';

const log = createLogger('event:rsvp-service');

export interface CreateRSVPResult {
  status: RSVPStatus;
  waitlistPosition?: number;
  rsvpId: string;
}

/**
 * Create or update an RSVP for a user on an instance.
 * Determines CONFIRMED or WAITLIST based on current capacity.
 */
export async function createOrUpdateRSVP(
  userId: string,
  instanceId: string,
  organizationId: string,
): Promise<CreateRSVPResult> {
  log.info('RSVP createOrUpdate', { userId, instanceId });

  // Rate limit check
  const rateLimit = await checkRSVPRateLimit(userId);
  if (!rateLimit.allowed) {
    throw new Error('RATE_LIMITED: Terlalu banyak RSVP dalam waktu singkat. Coba lagi dalam 1 jam.');
  }

  // Validate instance exists and is PLANNED
  const instance = await prisma.kegiatanInstance.findUnique({
    where: { id: instanceId },
    select: { id: true, status: true, capacity: true },
  });

  if (!instance) {
    throw new Error('NOT_FOUND: Instance tidak ditemukan.');
  }
  if (instance.status !== 'PLANNED') {
    throw new Error('BAD_REQUEST: RSVP hanya tersedia untuk kegiatan yang berstatus PLANNED.');
  }

  // Count confirmed RSVPs
  const confirmedCount = await prisma.rSVP.count({
    where: { instanceId, status: 'CONFIRMED' },
  });

  // Determine status
  let status: RSVPStatus;
  let waitlistPosition: number | undefined;

  if (instance.capacity === null || confirmedCount < instance.capacity) {
    status = 'CONFIRMED';
  } else {
    status = 'WAITLIST';
    // Get next waitlist position
    const maxPosition = await prisma.rSVP.aggregate({
      where: { instanceId, status: 'WAITLIST' },
      _max: { waitlistPosition: true },
    });
    waitlistPosition = (maxPosition._max.waitlistPosition ?? 0) + 1;
  }

  // Upsert RSVP
  const rsvp = await prisma.rSVP.upsert({
    where: { instanceId_userId: { instanceId, userId } },
    create: {
      instanceId,
      userId,
      organizationId,
      status,
      respondedAt: new Date(),
      waitlistPosition: status === 'WAITLIST' ? waitlistPosition : null,
    },
    update: {
      status,
      respondedAt: new Date(),
      waitlistPosition: status === 'WAITLIST' ? waitlistPosition : null,
      cancelledAt: null,
      promotedAt: null,
    },
    select: { id: true, status: true, waitlistPosition: true },
  });

  // Audit log
  await createRSVPAuditLog({
    action: 'RSVP_CREATE',
    actorUserId: userId,
    instanceId,
    entityId: rsvp.id,
    afterValue: { status, waitlistPosition },
    organizationId,
  });

  // Invalidate cache
  await invalidateInstanceCache(instanceId);

  log.info('RSVP created/updated', { userId, instanceId, status, waitlistPosition });

  return {
    status: rsvp.status,
    waitlistPosition: rsvp.waitlistPosition ?? undefined,
    rsvpId: rsvp.id,
  };
}

/**
 * Decline an RSVP.
 * Uses pg_advisory_xact_lock + Serializable isolation to prevent race conditions
 * when concurrently promoting waitlist users.
 *
 * Advisory lock key: hashtext(instanceId) — serializes DECLINEs on same instance.
 */
export async function declineRSVP(
  userId: string,
  instanceId: string,
): Promise<{ promoted: boolean; promotedUserId?: string }> {
  log.info('RSVP decline', { userId, instanceId });

  let promotedUserId: string | undefined;

  await prisma.$transaction(
    async (tx) => {
      // 1. Advisory lock on instanceId to prevent concurrent promotes
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${instanceId}::text))`;

      // 2. Get current RSVP
      const currentRSVP = await tx.rSVP.findUnique({
        where: { instanceId_userId: { instanceId, userId } },
        select: { id: true, status: true, organizationId: true },
      });

      if (!currentRSVP) {
        throw new Error('NOT_FOUND: RSVP tidak ditemukan.');
      }

      const wasConfirmed = currentRSVP.status === 'CONFIRMED';

      // 3. Mark user as DECLINED
      await tx.rSVP.update({
        where: { instanceId_userId: { instanceId, userId } },
        data: {
          status: 'DECLINED',
          cancelledAt: new Date(),
          waitlistPosition: null,
          respondedAt: new Date(),
        },
      });

      // 4. Audit decline
      await tx.nawasenaAuditLog.create({
        data: {
          action: 'RSVP_DECLINE',
          actorUserId: userId,
          entityType: 'RSVP',
          entityId: currentRSVP.id,
          organizationId: currentRSVP.organizationId,
          beforeValue: { status: currentRSVP.status },
          afterValue: { status: 'DECLINED' },
        },
      });

      // 5. If was CONFIRMED, promote top waitlist user (FIFO)
      if (wasConfirmed) {
        const nextWaitlist = await tx.rSVP.findFirst({
          where: { instanceId, status: 'WAITLIST' },
          orderBy: [{ waitlistPosition: 'asc' }, { respondedAt: 'asc' }],
          select: { id: true, userId: true, organizationId: true },
        });

        if (nextWaitlist) {
          await tx.rSVP.update({
            where: { id: nextWaitlist.id },
            data: {
              status: 'CONFIRMED',
              promotedAt: new Date(),
              waitlistPosition: null,
              respondedAt: new Date(),
            },
          });

          // Audit promote
          await tx.nawasenaAuditLog.create({
            data: {
              action: 'RSVP_WAITLIST_PROMOTE',
              actorUserId: userId,
              subjectUserId: nextWaitlist.userId,
              entityType: 'RSVP',
              entityId: nextWaitlist.id,
              organizationId: nextWaitlist.organizationId,
              beforeValue: { status: 'WAITLIST' },
              afterValue: { status: 'CONFIRMED' },
              metadata: { trigger: 'DECLINE_PROMOTE', declinedBy: userId },
            },
          });

          promotedUserId = nextWaitlist.userId;
          log.info('Waitlist user promoted', { promotedUserId, instanceId });
        }

        // Renumber remaining waitlist positions
        if (!nextWaitlist) {
          log.debug('No waitlist users to promote', { instanceId });
        }
      }
    },
    { isolationLevel: 'Serializable' },
  );

  // After commit: send notification to promoted user (fire-and-forget)
  if (promotedUserId) {
    sendWaitlistPromotedNotification(promotedUserId, instanceId).catch((err) => {
      log.warn('Failed to send waitlist promoted notification', { error: err, promotedUserId, instanceId });
    });
  }

  // Invalidate cache
  await invalidateInstanceCache(instanceId);

  return { promoted: Boolean(promotedUserId), promotedUserId };
}

/**
 * Get RSVP list scoped by requestor role.
 * - Maba: sees CONFIRMED user names only (no DECLINED), own status
 * - OC/SC: sees full list with all details
 */
export async function getRSVPListScoped(
  instanceId: string,
  requestorUserId: string,
  requestorRole: string,
) {
  const isOC = ['OC', 'SC', 'SUPERADMIN'].includes(requestorRole);
  const cacheKey = `event:instance:${instanceId}:rsvp-list:${isOC ? 'oc' : requestorUserId}`;

  // Short TTL for RSVP list (60s)
  const { withCache, CACHE_TTL } = await import('@/lib/cache');
  return withCache(cacheKey, CACHE_TTL.SHORT, async () => {
    if (isOC) {
      return getListOC(instanceId);
    }

    // Maba: only see CONFIRMED list (names only) + own RSVP
    const [confirmedList, ownRsvp] = await Promise.all([
      prisma.rSVP.findMany({
        where: { instanceId, status: 'CONFIRMED' },
        select: {
          id: true,
          status: true,
          respondedAt: true,
          user: {
            select: { id: true, fullName: true, displayName: true },
          },
        },
        orderBy: { respondedAt: 'asc' },
      }),
      prisma.rSVP.findUnique({
        where: { instanceId_userId: { instanceId, userId: requestorUserId } },
        select: { id: true, status: true, waitlistPosition: true, respondedAt: true },
      }),
    ]);

    return {
      confirmed: confirmedList.map((r) => ({
        id: r.id,
        status: r.status,
        respondedAt: r.respondedAt,
        userName: r.user.displayName ?? r.user.fullName,
      })),
      myRsvp: ownRsvp,
      total: confirmedList.length,
    };
  });
}

/**
 * Get full RSVP list for OC (all statuses + full user details).
 */
export async function getListOC(instanceId: string) {
  log.debug('Fetching OC RSVP list', { instanceId });

  const rsvps = await prisma.rSVP.findMany({
    where: { instanceId },
    select: {
      id: true,
      status: true,
      respondedAt: true,
      waitlistPosition: true,
      promotedAt: true,
      cancelledAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
          displayName: true,
          nrp: true,
          email: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' },
      { respondedAt: 'asc' },
    ],
  });

  return {
    confirmed: rsvps.filter((r) => r.status === 'CONFIRMED'),
    waitlist: rsvps.filter((r) => r.status === 'WAITLIST'),
    declined: rsvps.filter((r) => r.status === 'DECLINED'),
    total: rsvps.length,
  };
}

/**
 * Export RSVP list as CSV string for OC.
 */
export async function exportRSVPCSV(instanceId: string): Promise<string> {
  log.info('Exporting RSVP CSV', { instanceId });

  const rsvps = await prisma.rSVP.findMany({
    where: { instanceId },
    select: {
      status: true,
      respondedAt: true,
      promotedAt: true,
      user: {
        select: { fullName: true, nrp: true, email: true },
      },
    },
    orderBy: [{ status: 'asc' }, { respondedAt: 'asc' }],
  });

  const header = 'Nama,NRP,Email,Status,RespondedAt,PromotedAt';
  const rows = rsvps.map((r) => [
    `"${r.user.fullName}"`,
    r.user.nrp ?? '',
    r.user.email,
    r.status,
    r.respondedAt.toISOString(),
    r.promotedAt?.toISOString() ?? '',
  ].join(','));

  return [header, ...rows].join('\n');
}

// ============================================
// Helpers
// ============================================

async function createRSVPAuditLog(params: {
  action: 'RSVP_CREATE' | 'RSVP_UPDATE';
  actorUserId: string;
  instanceId: string;
  entityId: string;
  afterValue: object;
  organizationId: string;
}): Promise<void> {
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        action: params.action,
        actorUserId: params.actorUserId,
        entityType: 'RSVP',
        entityId: params.entityId,
        organizationId: params.organizationId,
        afterValue: params.afterValue,
        metadata: { instanceId: params.instanceId },
      },
    });
  } catch (err) {
    log.warn('Failed to create RSVP audit log', { error: err });
  }
}

async function sendWaitlistPromotedNotification(
  userId: string,
  instanceId: string,
): Promise<void> {
  try {
    const { sendNotification } = await import('@/lib/notifications/send');
    await sendNotification({
      userId,
      templateKey: 'RSVP_WAITLIST_PROMOTED',
      payload: { instanceId },
      category: 'NORMAL',
    });
    log.info('Waitlist promoted notification sent', { userId, instanceId });
  } catch (err) {
    log.warn('Failed to send waitlist promoted notification', { error: err, userId, instanceId });
  }
}
