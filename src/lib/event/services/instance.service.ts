/**
 * src/lib/event/services/instance.service.ts
 * NAWASENA M06 — KegiatanInstance query services.
 *
 * Provides:
 * - getPublicUpcomingForKegiatan — public catalog (no auth, limited fields)
 * - getPublicInstanceDetail — public instance detail (no private fields)
 * - getListingForMaba — Maba dashboard listing (3 buckets: Upcoming/Ongoing/Past)
 * - getInstanceDetail — role-shaped detail (hides OC-internal fields from Maba)
 */

import { prisma } from '@/utils/prisma';
import { withCache, CACHE_TTL } from '@/lib/cache';
import { createLogger } from '@/lib/logger';

const log = createLogger('event:instance-service');

// ============================================
// Public (no auth) — catalog use
// ============================================

/**
 * Get upcoming KegiatanInstances for a Kegiatan in the next 30 days.
 * Used by public catalog (/kegiatan/[id] page).
 * Returns limited subset — no private fields.
 * Cached 3600s.
 */
export async function getPublicUpcomingForKegiatan(
  kegiatanId: string,
  orgCode?: string,
) {
  const cacheKey = `kegiatan:instances:upcoming:${orgCode ?? 'global'}:${kegiatanId}`;

  return withCache(cacheKey, CACHE_TTL.HOUR, async () => {
    log.debug('Fetching public upcoming instances', { kegiatanId, orgCode });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Resolve org if orgCode provided
    let organizationId: string | undefined;
    if (orgCode) {
      const org = await prisma.organization.findFirst({
        where: { code: orgCode, publicCatalogEnabled: true },
        select: { id: true },
      });
      organizationId = org?.id;
    }

    const instances = await prisma.kegiatanInstance.findMany({
      where: {
        kegiatanId,
        status: 'PLANNED',
        scheduledAt: { gte: now, lte: thirtyDaysFromNow },
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        id: true,
        scheduledAt: true,
        location: true,
        capacity: true,
        status: true,
        materiLinkUrl: true,
        kegiatanId: true,
        kegiatan: { select: { id: true, nama: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    // Return only city-level location for public display
    return instances.map((i) => ({
      id: i.id,
      scheduledAt: i.scheduledAt,
      locationDisplay: extractCityFromLocation(i.location),
      kegiatanId: i.kegiatanId,
      kegiatanNama: i.kegiatan.nama,
      status: i.status,
      hasMaterial: Boolean(i.materiLinkUrl),
    }));
  });
}

/**
 * Get public instance detail for a specific instance.
 * Used by /kegiatan/instance/[instanceId] page.
 * NEVER returns: notesPanitia, picRoleHint, capacity detail.
 */
export async function getPublicInstanceDetail(instanceId: string) {
  const cacheKey = `event:instance:${instanceId}:public`;

  return withCache(cacheKey, CACHE_TTL.LONG, async () => {
    log.debug('Fetching public instance detail', { instanceId });

    const instance = await prisma.kegiatanInstance.findUnique({
      where: { id: instanceId },
      select: {
        id: true,
        scheduledAt: true,
        location: true,
        status: true,
        materiLinkUrl: true,
        kegiatanId: true,
        kegiatan: {
          select: {
            id: true,
            nama: true,
            deskripsiSingkat: true,
            fase: true,
            kategori: true,
            intensity: true,
            scale: true,
          },
        },
      },
    });

    if (!instance) return null;

    return {
      id: instance.id,
      scheduledAt: instance.scheduledAt,
      locationDisplay: extractCityFromLocation(instance.location),
      status: instance.status,
      hasMaterial: Boolean(instance.materiLinkUrl),
      kegiatan: instance.kegiatan,
    };
  });
}

// ============================================
// Authenticated — Maba dashboard
// ============================================

export interface MabaListingFilters {
  fase?: string;
  kategori?: string;
}

/**
 * Get event listing for Maba dashboard.
 * Returns 3 buckets: upcoming (PLANNED), ongoing (RUNNING), past (DONE/CANCELLED).
 * Includes user's own RSVP status per instance.
 * Cached 300s (short TTL — RSVP status is mutable).
 */
export async function getListingForMaba(
  userId: string,
  cohortId: string,
  filters?: MabaListingFilters,
) {
  const filterHash = JSON.stringify(filters ?? {});
  const cacheKey = `event:maba:listing:${userId}:${filterHash}`;

  return withCache(cacheKey, CACHE_TTL.SHORT, async () => {
    log.debug('Fetching Maba listing', { userId, cohortId, filters });

    const now = new Date();

    const instances = await prisma.kegiatanInstance.findMany({
      where: {
        cohortId,
        ...(filters?.fase ? { kegiatan: { fase: filters.fase as never } } : {}),
        ...(filters?.kategori ? { kegiatan: { kategori: filters.kategori as never } } : {}),
      },
      select: {
        id: true,
        scheduledAt: true,
        executedAt: true,
        location: true,
        capacity: true,
        status: true,
        kegiatanId: true,
        organizationId: true,
        kegiatan: {
          select: {
            id: true,
            nama: true,
            deskripsiSingkat: true,
            fase: true,
            kategori: true,
            intensity: true,
            scale: true,
          },
        },
        rsvps: {
          where: { userId },
          select: {
            id: true,
            status: true,
            waitlistPosition: true,
            respondedAt: true,
          },
          take: 1,
        },
        _count: {
          select: {
            rsvps: {
              where: { status: 'CONFIRMED' },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const upcoming = instances.filter(
      (i) => i.status === 'PLANNED' && i.scheduledAt >= now,
    );
    const ongoing = instances.filter((i) => i.status === 'RUNNING');
    const past = instances.filter(
      (i) => i.status === 'DONE' || i.status === 'CANCELLED' ||
        (i.status === 'PLANNED' && i.scheduledAt < new Date(now.getTime() - 24 * 60 * 60 * 1000)),
    );

    const mapInstance = (i: typeof instances[0]) => ({
      id: i.id,
      scheduledAt: i.scheduledAt,
      executedAt: i.executedAt,
      locationDisplay: extractCityFromLocation(i.location),
      capacity: i.capacity,
      status: i.status,
      kegiatan: i.kegiatan,
      confirmedCount: i._count.rsvps,
      myRsvp: i.rsvps[0] ?? null,
    });

    return {
      upcoming: upcoming.map(mapInstance),
      ongoing: ongoing.map(mapInstance),
      past: past.map(mapInstance),
    };
  });
}

/**
 * Get instance detail for Maba (role-shaped — hides internal OC fields).
 * Includes user's own RSVP and RSVP counts.
 * Cached 300s.
 */
export async function getInstanceDetail(instanceId: string, userId: string) {
  const cacheKey = `event:instance:${instanceId}:detail:${userId}`;

  return withCache(cacheKey, CACHE_TTL.SHORT, async () => {
    log.debug('Fetching instance detail', { instanceId, userId });

    const instance = await prisma.kegiatanInstance.findUnique({
      where: { id: instanceId },
      select: {
        id: true,
        scheduledAt: true,
        executedAt: true,
        location: true,
        capacity: true,
        status: true,
        materiLinkUrl: true,
        kegiatanId: true,
        organizationId: true,
        cohortId: true,
        npsRequestedAt: true,
        // notesPanitia and picRoleHint are excluded for Maba
        kegiatan: {
          select: {
            id: true,
            nama: true,
            deskripsiSingkat: true,
            deskripsiFull: true,
            rasional: true,
            fase: true,
            kategori: true,
            intensity: true,
            scale: true,
            durasiMenit: true,
            tujuan: {
              select: { id: true, ordinal: true, text: true },
              orderBy: { ordinal: 'asc' },
            },
          },
        },
        rsvps: {
          where: { userId },
          select: {
            id: true,
            status: true,
            waitlistPosition: true,
            respondedAt: true,
          },
          take: 1,
        },
        _count: {
          select: {
            rsvps: {
              where: { status: 'CONFIRMED' },
            },
          },
        },
      },
    });

    if (!instance) return null;

    // Count waitlist separately
    const waitlistCount = await prisma.rSVP.count({
      where: { instanceId, status: 'WAITLIST' },
    });

    return {
      id: instance.id,
      scheduledAt: instance.scheduledAt,
      executedAt: instance.executedAt,
      location: instance.location,
      locationDisplay: extractCityFromLocation(instance.location),
      capacity: instance.capacity,
      status: instance.status,
      materiLinkUrl: instance.materiLinkUrl,
      organizationId: instance.organizationId,
      cohortId: instance.cohortId,
      npsRequestedAt: instance.npsRequestedAt,
      kegiatan: instance.kegiatan,
      confirmedCount: instance._count.rsvps,
      waitlistCount,
      myRsvp: instance.rsvps[0] ?? null,
    };
  });
}

/**
 * Get OC-level instance detail (includes internal fields).
 */
export async function getInstanceDetailOC(instanceId: string) {
  log.debug('Fetching OC instance detail', { instanceId });

  const instance = await prisma.kegiatanInstance.findUnique({
    where: { id: instanceId },
    select: {
      id: true,
      scheduledAt: true,
      executedAt: true,
      location: true,
      capacity: true,
      status: true,
      materiLinkUrl: true,
      notesPanitia: true,
      picRoleHint: true,
      kegiatanId: true,
      organizationId: true,
      cohortId: true,
      npsRequestedAt: true,
      kegiatan: {
        select: {
          id: true,
          nama: true,
          deskripsiSingkat: true,
          fase: true,
          kategori: true,
          intensity: true,
          scale: true,
        },
      },
      _count: {
        select: {
          rsvps: { where: { status: 'CONFIRMED' } },
        },
      },
    },
  });

  if (!instance) return null;

  const [waitlistCount, attendanceCount] = await Promise.all([
    prisma.rSVP.count({ where: { instanceId, status: 'WAITLIST' } }),
    prisma.attendance.count({ where: { instanceId } }),
  ]);

  return {
    ...instance,
    confirmedCount: instance._count.rsvps,
    waitlistCount,
    attendanceCount,
  };
}

/**
 * Get all instances for OC listing (hub page).
 */
export async function getInstanceListOC(organizationId: string) {
  const cacheKey = `event:oc:listing:${organizationId}`;

  return withCache(cacheKey, CACHE_TTL.SHORT, async () => {
    log.debug('Fetching OC instance list', { organizationId });

    const instances = await prisma.kegiatanInstance.findMany({
      where: { organizationId },
      select: {
        id: true,
        scheduledAt: true,
        executedAt: true,
        location: true,
        status: true,
        capacity: true,
        kegiatanId: true,
        kegiatan: {
          select: { id: true, nama: true, fase: true, kategori: true },
        },
        _count: {
          select: {
            rsvps: { where: { status: 'CONFIRMED' } },
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return instances.map((i) => ({
      ...i,
      confirmedCount: i._count.rsvps,
    }));
  });
}

// ============================================
// Utilities
// ============================================

/**
 * Extract city-level display from location string.
 * For privacy — only show city, not full address for public pages.
 */
function extractCityFromLocation(location: string): string {
  // If it's a URL (online event), return "Online"
  if (location.startsWith('http://') || location.startsWith('https://')) {
    return 'Online';
  }
  // Extract first meaningful part (before comma or parenthesis)
  const parts = location.split(/[,|()]/);
  return parts[parts.length - 1]?.trim() || location;
}
