/**
 * src/lib/redflag-rules/engine.ts
 * Red Flag Rules Engine for M13.
 *
 * Runs all registered rules for a cohort and upserts RedFlagAlert records.
 * Auto-resolves alerts when underlying condition is no longer detected.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { AlertStatus } from '@prisma/client';
import { RULES } from './index';
import { invalidateAlertCache } from '@/lib/dashboard/cache';

const log = createLogger('m13/redflag-engine');

export interface EngineRunResult {
  cohortId: string;
  durationMs: number;
  alertsCreated: number;
  alertsUpdated: number;
  alertsResolved: number;
  errors: string[];
}

/**
 * Run all enabled rules for a single cohort.
 * - New hits → create ACTIVE alert (or update lastSeenAt via computedAt)
 * - Existing active alerts no longer hit → auto-resolve (RESOLVED)
 */
export async function runRulesForCohort(
  cohortId: string,
  organizationId: string,
): Promise<EngineRunResult> {
  const start = Date.now();
  let alertsCreated = 0;
  let alertsUpdated = 0;
  let alertsResolved = 0;
  const errors: string[] = [];

  log.info('Running rules for cohort', { cohortId });

  const enabledRules = RULES.filter((r) => r.enabled);

  // Collect all hits from all rules
  const allHits: Array<{
    ruleType: string;
    targetUserId?: string | null;
    targetResourceId?: string | null;
    title: string;
    description?: string;
    severity: string;
    targetRoles: string[];
    targetUrl: string;
    metadata?: Record<string, unknown>;
  }> = [];

  for (const rule of enabledRules) {
    try {
      const hits = await rule.evaluate({
        cohortId,
        organizationId,
        prisma,
        log,
      });

      for (const hit of hits) {
        allHits.push({
          ruleType: rule.type,
          ...hit,
        });
      }
    } catch (err) {
      const msg = `Rule ${rule.type}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      log.error('Rule evaluation failed', { rule: rule.type, cohortId, error: err });
    }
  }

  // Get all currently ACTIVE alerts for this cohort
  const existingActive = await prisma.redFlagAlert.findMany({
    where: { cohortId, status: AlertStatus.ACTIVE },
    select: {
      id: true,
      type: true,
      targetUserId: true,
    },
  });

  // Build a set of existing alert dedup keys
  const existingKeys = new Map(
    existingActive.map((a) => [`${a.type}:${a.targetUserId ?? 'null'}`, a.id]),
  );

  // Build a set of current hit keys
  const hitKeys = new Set(
    allHits.map((h) => `${h.ruleType}:${h.targetUserId ?? 'null'}`),
  );

  // Upsert hits
  for (const hit of allHits) {
    const dedupeKey = `${hit.ruleType}:${hit.targetUserId ?? 'null'}`;
    const existingId = existingKeys.get(dedupeKey);

    try {
      if (existingId) {
        // Update existing alert — bump computedAt (lastSeenAt proxy)
        await prisma.redFlagAlert.update({
          where: { id: existingId },
          data: {
            computedAt: new Date(),
            title: hit.title,
            description: hit.description,
            metadata: hit.metadata ? JSON.parse(JSON.stringify(hit.metadata)) : undefined,
          },
        });
        alertsUpdated++;
      } else {
        // Create new alert
        await prisma.redFlagAlert.create({
          data: {
            organizationId,
            cohortId,
            type: hit.ruleType as Parameters<typeof prisma.redFlagAlert.create>[0]['data']['type'],
            severity: hit.severity as Parameters<typeof prisma.redFlagAlert.create>[0]['data']['severity'],
            status: AlertStatus.ACTIVE,
            targetUserId: hit.targetUserId,
            targetRoles: hit.targetRoles as Parameters<typeof prisma.redFlagAlert.create>[0]['data']['targetRoles'],
            targetUrl: hit.targetUrl,
            title: hit.title,
            description: hit.description,
            metadata: hit.metadata ? JSON.parse(JSON.stringify(hit.metadata)) : undefined,
          },
        });
        alertsCreated++;
      }
    } catch (err) {
      const msg = `Upsert alert ${hit.ruleType}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      log.error('Alert upsert failed', { ruleType: hit.ruleType, error: err });
    }
  }

  // Auto-resolve alerts that are no longer hitting
  for (const [dedupeKey, alertId] of existingKeys.entries()) {
    if (!hitKeys.has(dedupeKey)) {
      try {
        await prisma.redFlagAlert.update({
          where: { id: alertId },
          data: {
            status: AlertStatus.RESOLVED,
            resolvedAt: new Date(),
          },
        });
        alertsResolved++;
      } catch (err) {
        const msg = `Auto-resolve ${dedupeKey}: ${err instanceof Error ? err.message : String(err)}`;
        errors.push(msg);
        log.error('Alert auto-resolve failed', { dedupeKey, error: err });
      }
    }
  }

  const durationMs = Date.now() - start;

  log.info('Rules completed for cohort', {
    cohortId,
    alertsCreated,
    alertsUpdated,
    alertsResolved,
    errors: errors.length,
    durationMs,
  });

  // Invalidate alert cache after run (non-blocking)
  invalidateAlertCache(cohortId).catch(() => {});

  return { cohortId, durationMs, alertsCreated, alertsUpdated, alertsResolved, errors };
}

/**
 * Run all enabled rules for all active cohorts.
 * Called by the cron every 30 minutes.
 */
export async function runEngineForAllCohorts(): Promise<{
  cohortsProcessed: number;
  cohortsFailed: number;
  totalAlertsCreated: number;
  totalAlertsResolved: number;
  durationMs: number;
}> {
  const start = Date.now();
  let cohortsProcessed = 0;
  let cohortsFailed = 0;
  let totalAlertsCreated = 0;
  let totalAlertsResolved = 0;

  const activeCohorts = await prisma.cohort.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, organizationId: true, code: true },
  });

  log.info('Red flag engine starting', { cohortCount: activeCohorts.length });

  for (const cohort of activeCohorts) {
    try {
      const result = await runRulesForCohort(cohort.id, cohort.organizationId);
      cohortsProcessed++;
      totalAlertsCreated += result.alertsCreated;
      totalAlertsResolved += result.alertsResolved;
    } catch (err) {
      cohortsFailed++;
      log.error('Cohort engine run failed', { cohortId: cohort.id, error: err });
    }
  }

  const durationMs = Date.now() - start;
  log.info('Red flag engine completed', {
    cohortsProcessed,
    cohortsFailed,
    totalAlertsCreated,
    totalAlertsResolved,
    durationMs,
  });

  return { cohortsProcessed, cohortsFailed, totalAlertsCreated, totalAlertsResolved, durationMs };
}
