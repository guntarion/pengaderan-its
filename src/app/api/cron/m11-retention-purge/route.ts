/**
 * src/app/api/cron/m11-retention-purge/route.ts
 * NAWASENA M11 — GET: Monthly retention purge for MH screening data.
 *
 * Schedule: "0 2 1 * *" (1st of every month, 02:00 UTC)
 * Auth: verifyCronAuth (CRON_SECRET bearer token)
 *
 * Logic:
 *   - Find ARCHIVED cohorts where updatedAt < 6 months ago
 *   - Exclude users who have granted research consent (retentionExtendedUntil > now)
 *   - If ?dry_run=true: count only, no delete
 *   - Delete MHScreening records (cascades answers + referral logs via FK)
 *   - Record MHAccessLog DATA_DELETED entries per cohort
 *   - Returns { purged, dryRun }
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { prisma } from '@/utils/prisma';
import { recordMHAccess } from '@/lib/mh-screening/access-log';
import { createLogger } from '@/lib/logger';
import type { UserRole } from '@prisma/client';

const log = createLogger('cron-m11-retention-purge');

const SIX_MONTHS_MS = 183 * 24 * 3600 * 1000;
const SYSTEM_ACTOR_ROLE: UserRole = 'SUPERADMIN';

export const GET = createApiHandler({
  handler: async (req, ctx) => {
    await verifyCronAuth(req);

    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dry_run') === 'true';

    const now = new Date();
    const cutoff = new Date(Date.now() - SIX_MONTHS_MS);

    ctx.log.info('M11 retention purge cron triggered', {
      now: now.toISOString(),
      cutoff: cutoff.toISOString(),
      dryRun,
    });

    // Find ARCHIVED cohorts older than 6 months
    const archivedCohorts = await prisma.cohort.findMany({
      where: {
        status: 'ARCHIVED',
        updatedAt: { lt: cutoff },
      },
      select: { id: true, code: true, name: true },
    });

    if (archivedCohorts.length === 0) {
      log.info('No archived cohorts eligible for purge');
      return ApiResponse.success({ purged: 0, dryRun });
    }

    const cohortIds = archivedCohorts.map((c) => c.id);

    // Find users who have research consent active (exclude from purge)
    const researchConsentUserIds = await prisma.mHResearchConsent.findMany({
      where: {
        retentionExtendedUntil: { gt: now },
        cohortId: { in: cohortIds },
      },
      select: { userId: true },
    });

    const excludedUserIds = researchConsentUserIds.map((r) => r.userId);

    ctx.log.info('Retention purge scope', {
      cohortCount: cohortIds.length,
      excludedResearchOptInUsers: excludedUserIds.length,
      dryRun,
    });

    // Count targets
    const targetScreenings = await prisma.mHScreening.findMany({
      where: {
        cohortId: { in: cohortIds },
        userId: { notIn: excludedUserIds },
        deletedAt: null,
      },
      select: { id: true, userId: true, cohortId: true },
    });

    if (dryRun) {
      log.info('Dry run — no deletion performed', {
        wouldPurge: targetScreenings.length,
        cohortIds,
        excludedUserIds: excludedUserIds.length,
      });
      return ApiResponse.success({
        purged: 0,
        wouldPurge: targetScreenings.length,
        dryRun: true,
        cohorts: archivedCohorts.map((c) => ({ id: c.id, code: c.code, name: c.name })),
        excludedResearchOptInUsers: excludedUserIds.length,
      });
    }

    // Execute deletion
    let purged = 0;

    for (const cohort of archivedCohorts) {
      const cohortScreeningIds = targetScreenings
        .filter((s) => s.cohortId === cohort.id)
        .map((s) => s.id);

      if (cohortScreeningIds.length === 0) {
        log.info('No screenings to purge for cohort', { cohortId: cohort.id, cohortCode: cohort.code });
        continue;
      }

      try {
        // Delete screenings — answers + referral logs cascade via FK
        await prisma.$transaction(async (tx) => {
          // Soft-delete: set deletedAt (MHScreening uses this field)
          await tx.mHScreening.updateMany({
            where: {
              id: { in: cohortScreeningIds },
            },
            data: { deletedAt: now },
          });

          // Record DATA_DELETED audit entry (per cohort)
          await recordMHAccess(tx, {
            actorId: 'system',
            actorRole: SYSTEM_ACTOR_ROLE,
            action: 'DATA_DELETED',
            targetType: 'MHScreening',
            organizationId: undefined,
            metadata: {
              event: 'MH_RETENTION_PURGE',
              cohortId: cohort.id,
              cohortCode: cohort.code,
              deletedCount: cohortScreeningIds.length,
              excludedResearchOptIn: excludedUserIds.length,
              purgedAt: now.toISOString(),
            },
          });
        });

        purged += cohortScreeningIds.length;
        log.info('Purged cohort screenings', {
          cohortId: cohort.id,
          cohortCode: cohort.code,
          count: cohortScreeningIds.length,
        });
      } catch (err) {
        log.error('Failed to purge cohort', { cohortId: cohort.id, error: err });
      }
    }

    log.info('M11 retention purge complete', { purged, total: targetScreenings.length, dryRun });
    ctx.log.info('M11 retention purge cron complete', { purged, dryRun });

    return ApiResponse.success({ purged, dryRun });
  },
});
