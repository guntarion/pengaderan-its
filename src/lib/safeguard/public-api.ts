/**
 * src/lib/safeguard/public-api.ts
 * NAWASENA M10 — Public API for M09 red flag cascade integration.
 *
 * Contract version: 1.0
 * Feature flag: M09_M10_CASCADE_ENABLED (default: false until M10 deployed)
 *
 * This module provides a type-safe in-process API for M09 to call when
 * creating safeguard incidents from daily log red flags.
 * No HTTP round-trip required — same deployment.
 *
 * Redis dedup key: `m10-cascade:{kpLogDailyId}` TTL 3600s
 * Stores: JSON { incidentId, createdAt }
 *
 * @example
 * const result = await createIncidentFromM09RedFlag({
 *   kpLogDailyId: 'log_abc123',
 *   redFlagType: 'INJURY',
 *   organizationId: 'org_xyz',
 *   cohortId: 'cohort_123',
 *   reporterUserId: 'user_kp',
 *   description: 'Maba fell during relay run',
 *   occurredAt: new Date(),
 * });
 * // result: { status: 'CREATED', incidentId: 'inc_abc' }
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { createIncident } from './incident-service';
import { transitionStatus } from './incident-service';
import type { IncidentActor } from './types';
import {
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
} from '@prisma/client';

const log = createLogger('safeguard:public-api:m09');

const CASCADE_DEDUP_TTL = 3600; // 1 hour

/** Feature flag: enable M09 → M10 cascade */
function isCascadeEnabled(): boolean {
  return process.env.M09_M10_CASCADE_ENABLED === 'true';
}

/** Dedup Redis key */
function dedupKey(kpLogDailyId: string): string {
  return `m10-cascade:${kpLogDailyId}`;
}

/** Map M09 red flag type to M10 IncidentType + IncidentSeverity */
function mapRedFlagToIncident(redFlagType: string): {
  type: IncidentType;
  severity: IncidentSeverity;
} {
  switch (redFlagType.toUpperCase()) {
    case 'INJURY':
      return { type: IncidentType.INJURY, severity: IncidentSeverity.RED };
    case 'SHUTDOWN':
    case 'PSYCHOLOGICAL':
      return { type: IncidentType.SHUTDOWN, severity: IncidentSeverity.YELLOW };
    default:
      return { type: IncidentType.OTHER, severity: IncidentSeverity.YELLOW };
  }
}

export interface CreateIncidentFromM09Params {
  kpLogDailyId: string;
  redFlagType: string; // 'INJURY' | 'SHUTDOWN' | 'PSYCHOLOGICAL'
  organizationId: string;
  cohortId: string;
  reporterUserId: string;
  description: string;
  occurredAt: Date;
}

export interface CreateIncidentFromM09Result {
  status: 'CREATED' | 'EXISTING_RETURNED';
  incidentId: string;
}

/**
 * Create a safeguard incident from an M09 red flag cascade.
 *
 * Idempotent: if the same kpLogDailyId has already been processed
 * (within 1 hour via Redis), returns EXISTING_RETURNED with the
 * existing incident ID.
 *
 * Feature flag: if M09_M10_CASCADE_ENABLED !== 'true', returns a
 * stub result { status: 'CREATED', incidentId: 'M10_DISABLED' }
 * without creating any DB record.
 *
 * @param params - Cascade parameters from M09
 * @returns Result with status and incidentId
 */
export async function createIncidentFromM09RedFlag(
  params: CreateIncidentFromM09Params,
): Promise<CreateIncidentFromM09Result> {
  const { kpLogDailyId, redFlagType, organizationId, cohortId, reporterUserId, description, occurredAt } = params;

  log.info('createIncidentFromM09RedFlag called', { kpLogDailyId, redFlagType });

  // ---- Feature flag check ----
  if (!isCascadeEnabled()) {
    log.warn('M09_M10_CASCADE_ENABLED is off — returning stub', { kpLogDailyId });
    return { status: 'CREATED', incidentId: 'M10_DISABLED' };
  }

  // ---- Redis dedup check ----
  if (isRedisConfigured()) {
    const redis = getRedisClient();
    const key = dedupKey(kpLogDailyId);

    const existing = await redis.get<string>(key);
    if (existing) {
      let existingIncidentId: string;
      try {
        const parsed = JSON.parse(existing as string);
        existingIncidentId = parsed.incidentId ?? existing;
      } catch {
        existingIncidentId = existing as string;
      }

      log.info('Dedup hit — returning existing incident', { kpLogDailyId, existingIncidentId });
      return { status: 'EXISTING_RETURNED', incidentId: existingIncidentId };
    }
  } else {
    log.warn('Redis not configured — skipping M09 cascade dedup', { kpLogDailyId });

    // Fallback: check DB for existing incident with this kpLogDailyId
    const existingInDb = await prisma.safeguardIncident.findFirst({
      where: {
        organizationId,
        notes: {
          path: ['kpLogDailyId'],
          equals: kpLogDailyId,
        },
      },
      select: { id: true },
    });

    if (existingInDb) {
      log.info('DB dedup hit — returning existing incident', {
        kpLogDailyId,
        incidentId: existingInDb.id,
      });
      return { status: 'EXISTING_RETURNED', incidentId: existingInDb.id };
    }
  }

  // ---- Create the incident ----
  const { type, severity } = mapRedFlagToIncident(redFlagType);

  // Fetch reporter user for actor context
  const reporter = await prisma.user.findUnique({
    where: { id: reporterUserId },
    select: { id: true, role: true, organizationId: true, isSafeguardOfficer: true },
  });

  if (!reporter) {
    log.error('Reporter user not found for M09 cascade', { reporterUserId });
    throw new Error(`Reporter user not found: ${reporterUserId}`);
  }

  const actor: IncidentActor = {
    id: reporter.id,
    role: reporter.role as IncidentActor['role'],
    isSafeguardOfficer: reporter.isSafeguardOfficer,
    organizationId: organizationId,
  };

  const incident = await createIncident(
    {
      cohortId,
      type,
      severity,
      occurredAt: occurredAt.toISOString(),
      actionTaken: description.substring(0, 500),
      notes: {
        source: 'M09_CASCADE',
        kpLogDailyId,
        redFlagType,
        description,
      },
    },
    actor,
  );

  // Override status to PENDING_REVIEW (M09 cascade creates drafts)
  await prisma.safeguardIncident.update({
    where: { id: incident.id },
    data: { status: IncidentStatus.PENDING_REVIEW },
  });

  // ---- Store dedup in Redis ----
  if (isRedisConfigured()) {
    const redis = getRedisClient();
    const key = dedupKey(kpLogDailyId);
    await redis.set(
      key,
      JSON.stringify({ incidentId: incident.id, createdAt: new Date().toISOString() }),
      { ex: CASCADE_DEDUP_TTL },
    );
  }

  log.info('M09 cascade incident created', {
    kpLogDailyId,
    incidentId: incident.id,
    type,
    severity,
  });

  return { status: 'CREATED', incidentId: incident.id };
}

export interface SupersedeIncidentFromM09Params {
  kpLogDailyId: string;
  reason: string;
  actorUserId: string;
}

/**
 * Supersede a safeguard incident that was created from an M09 red flag
 * that has since been revoked (e.g., KP corrected the log entry).
 *
 * Only supersedes incidents in PENDING_REVIEW or OPEN status.
 * Terminal statuses (RESOLVED, ESCALATED_TO_SATGAS, etc.) are left untouched
 * with a warning log.
 *
 * Feature flag: if M09_M10_CASCADE_ENABLED !== 'true', logs a warning and returns.
 *
 * @param params - Supersede parameters
 */
export async function supersedeIncidentFromM09(
  params: SupersedeIncidentFromM09Params,
): Promise<void> {
  const { kpLogDailyId, reason, actorUserId } = params;

  log.info('supersedeIncidentFromM09 called', { kpLogDailyId, actorUserId });

  if (!isCascadeEnabled()) {
    log.warn('M09_M10_CASCADE_ENABLED is off — supersede skipped', { kpLogDailyId });
    return;
  }

  // ---- Look up incident by kpLogDailyId ----
  let incidentId: string | null = null;

  // Try Redis first
  if (isRedisConfigured()) {
    const redis = getRedisClient();
    const key = dedupKey(kpLogDailyId);
    const cached = await redis.get<string>(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached as string);
        incidentId = parsed.incidentId ?? null;
      } catch {
        incidentId = cached as string;
      }
    }
  }

  // Fallback to DB lookup
  if (!incidentId) {
    const found = await prisma.safeguardIncident.findFirst({
      where: {
        organizationId: undefined, // search all orgs is fine for internal call
        notes: {
          path: ['kpLogDailyId'],
          equals: kpLogDailyId,
        },
      },
      select: { id: true, status: true, organizationId: true },
    });
    incidentId = found?.id ?? null;
  }

  if (!incidentId) {
    log.warn('No incident found for kpLogDailyId — supersede skipped', { kpLogDailyId });
    return;
  }

  const incident = await prisma.safeguardIncident.findUnique({
    where: { id: incidentId },
    select: { id: true, status: true, organizationId: true },
  });

  if (!incident) {
    log.warn('Incident no longer exists', { incidentId });
    return;
  }

  // Only supersede if in a supersedable status
  const supersedableStatuses: IncidentStatus[] = [
    IncidentStatus.PENDING_REVIEW,
    IncidentStatus.OPEN,
  ];

  if (!supersedableStatuses.includes(incident.status)) {
    log.warn('Incident status is terminal — not superseding', {
      incidentId,
      status: incident.status,
    });
    return;
  }

  // ---- Fetch actor ----
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, role: true, organizationId: true, isSafeguardOfficer: true },
  });

  if (!actor) {
    log.error('Actor user not found for supersede', { actorUserId });
    return;
  }

  const incidentActor: IncidentActor = {
    id: actor.id,
    role: actor.role as IncidentActor['role'],
    isSafeguardOfficer: actor.isSafeguardOfficer,
    organizationId: incident.organizationId,
  };

  try {
    await transitionStatus(
      incidentId,
      IncidentStatus.SUPERSEDED,
      incidentActor,
      {
        type: 'NOTE',
        noteText: `Superseded by M09 cascade: ${reason}`,
      },
    );

    log.info('Incident superseded via M09 cascade', { incidentId, kpLogDailyId, reason });
  } catch (err) {
    log.error('Failed to supersede incident', { incidentId, error: err });
    throw err;
  }
}
