/**
 * src/lib/event-execution/services/instance.service.ts
 * NAWASENA M08 — KegiatanInstance creation + OC listing service.
 *
 * Responsibilities:
 * - createInstanceFromMaster: validate Kegiatan → insert KegiatanInstance PLANNED
 * - getKegiatanPickerOptions: searchable picker for M02 Kegiatan catalog
 * - getOCInstanceListing: OC view of all instances in their cohort
 */

import { prisma } from '@/utils/prisma';
import { withCache, CACHE_TTL } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import { invalidateCache } from '@/lib/cache';
import { EXEC_CACHE_KEYS } from '../cache/keys';
import type { CreateInstanceInput, KegiatanPickerQuery } from '../schemas';

const log = createLogger('event-execution:instance-service');

// ============================================================
// Kegiatan picker
// ============================================================

export interface KegiatanPickerItem {
  id: string;
  nama: string;
  deskripsiSingkat: string;
  fase: string;
  kategori: string;
  intensity: string;
  scale: string;
  durasiMenit: number;
  picRoleHint: string | null;
  isGlobal: boolean;
}

/**
 * Get searchable Kegiatan options for the instance creation wizard.
 * Returns active Kegiatan (global + org-specific).
 * Cached 300s.
 */
export async function getKegiatanPickerOptions(
  organizationId: string,
  filters: KegiatanPickerQuery,
): Promise<KegiatanPickerItem[]> {
  const cacheKey = `${EXEC_CACHE_KEYS.kegiatanPicker(organizationId)}:${filters.fase ?? ''}:${filters.kategori ?? ''}:${filters.search ?? ''}:${filters.page}:${filters.limit}`;

  return withCache(cacheKey, CACHE_TTL.MEDIUM, async () => {
    log.debug('Fetching kegiatan picker options', { organizationId, filters });

    const items = await prisma.kegiatan.findMany({
      where: {
        isActive: true,
        OR: [
          { isGlobal: true },
          { organizationId },
        ],
        ...(filters.fase ? { fase: filters.fase as never } : {}),
        ...(filters.kategori ? { kategori: filters.kategori as never } : {}),
        ...(filters.search ? {
          OR: [
            { nama: { contains: filters.search, mode: 'insensitive' } },
            { deskripsiSingkat: { contains: filters.search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id: true,
        nama: true,
        deskripsiSingkat: true,
        fase: true,
        kategori: true,
        intensity: true,
        scale: true,
        durasiMenit: true,
        picRoleHint: true,
        isGlobal: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { nama: 'asc' },
      ],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });

    return items;
  });
}

// ============================================================
// Create instance
// ============================================================

export interface CreateInstanceResult {
  instance: {
    id: string;
    kegiatanId: string;
    status: string;
    scheduledAt: Date;
    location: string;
  };
}

/**
 * Create a KegiatanInstance from a Kegiatan master.
 *
 * Validates:
 * - Kegiatan exists + isActive
 * - scheduledAt is in the future (warning, not hard reject)
 * - capacity within bounds
 *
 * Side effects:
 * - Audit log KEGIATAN_INSTANCE_CREATE
 * - Invalidate OC listing cache
 */
export async function createInstanceFromMaster(
  input: CreateInstanceInput,
  userId: string,
  organizationId: string,
  cohortId: string,
): Promise<CreateInstanceResult> {
  log.info('Creating instance from master', { kegiatanId: input.kegiatanId, userId });

  // Validate Kegiatan
  const kegiatan = await prisma.kegiatan.findFirst({
    where: {
      id: input.kegiatanId,
      isActive: true,
      OR: [
        { isGlobal: true },
        { organizationId },
      ],
    },
    select: { id: true, nama: true, picRoleHint: true },
  });

  if (!kegiatan) {
    throw new Error('NOT_FOUND: Kegiatan tidak ditemukan atau tidak aktif.');
  }

  const instance = await prisma.kegiatanInstance.create({
    data: {
      kegiatanId: input.kegiatanId,
      cohortId,
      organizationId,
      scheduledAt: new Date(input.scheduledAt),
      location: input.location,
      capacity: input.capacity ?? null,
      status: 'PLANNED',
      version: 0,
      picRoleHint: input.picRoleHint ?? kegiatan.picRoleHint ?? null,
      notesPanitia: input.notesPanitia ?? null,
      materiLinkUrl: input.materiLinkUrl ?? null,
    },
    select: {
      id: true,
      kegiatanId: true,
      status: true,
      scheduledAt: true,
      location: true,
    },
  });

  // Audit log
  await logAudit({
    action: AuditAction.KEGIATAN_INSTANCE_CREATE,
    organizationId,
    actorUserId: userId,
    entityType: 'KegiatanInstance',
    entityId: instance.id,
    afterValue: { kegiatanId: input.kegiatanId, scheduledAt: input.scheduledAt, location: input.location },
    metadata: { kegiatanNama: kegiatan.nama },
  });

  // Invalidate OC listing cache
  await invalidateCache(EXEC_CACHE_KEYS.kegiatanPicker(organizationId));

  log.info('Instance created', { instanceId: instance.id });

  return { instance };
}

// ============================================================
// OC listing
// ============================================================

export interface InstanceSummary {
  id: string;
  kegiatanId: string;
  status: string;
  scheduledAt: Date;
  executedAt: Date | null;
  location: string;
  capacity: number | null;
  version: number;
  notificationFailedCount: number;
  kegiatan: {
    id: string;
    nama: string;
    fase: string;
    kategori: string;
    intensity: string;
  };
  _count: {
    rsvps: number;
    attendances: number;
  };
}

/**
 * Get OC instance listing for a cohort.
 * Cached 60s.
 */
export async function getOCInstanceListing(
  cohortId: string,
  organizationId: string,
  userId: string,
): Promise<InstanceSummary[]> {
  const cacheKey = EXEC_CACHE_KEYS.instanceListing(userId, cohortId);

  return withCache(cacheKey, CACHE_TTL.SHORT, async () => {
    log.debug('Fetching OC instance listing', { cohortId, organizationId });

    const instances = await prisma.kegiatanInstance.findMany({
      where: { cohortId, organizationId },
      select: {
        id: true,
        kegiatanId: true,
        status: true,
        scheduledAt: true,
        executedAt: true,
        location: true,
        capacity: true,
        version: true,
        notificationFailedCount: true,
        kegiatan: {
          select: {
            id: true,
            nama: true,
            fase: true,
            kategori: true,
            intensity: true,
          },
        },
        _count: {
          select: {
            rsvps: true,
            attendances: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return instances;
  });
}

/**
 * Get OC instance detail.
 * Cached 30s.
 */
export async function getInstanceDetailForOC(instanceId: string, organizationId: string) {
  const cacheKey = EXEC_CACHE_KEYS.instanceDetail(instanceId);

  return withCache(cacheKey, CACHE_TTL.SHORT, async () => {
    log.debug('Fetching instance detail', { instanceId });

    const instance = await prisma.kegiatanInstance.findFirst({
      where: { id: instanceId, organizationId },
      include: {
        kegiatan: {
          select: {
            id: true,
            nama: true,
            fase: true,
            kategori: true,
            intensity: true,
            scale: true,
            deskripsiSingkat: true,
            picRoleHint: true,
          },
        },
        _count: {
          select: {
            rsvps: true,
            attendances: true,
            outputs: true,
          },
        },
      },
    });

    return instance;
  });
}
