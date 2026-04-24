/**
 * src/lib/mh-screening/aggregate.ts
 * NAWASENA M11 — Aggregate queries with mandatory cell-size floor.
 *
 * PRIVACY-CRITICAL:
 *   - Cell size floor = 5 is server-side ONLY (not a UI toggle).
 *   - Cells with count < 5 return null + masked=true.
 *   - All aggregate queries require withMHBypass (admin bypass + audit).
 *   - No individual userId is ever returned in aggregate responses.
 */

import { createLogger } from '@/lib/logger';
import { withMHBypass } from './rls-helpers';
import { recordMHAccess } from './access-log';
import type { UserRole } from '@prisma/client';

const log = createLogger('mh-aggregate');

export interface AggregateRow {
  kpGroupId: string | null;
  severity: string;
  phase: string;
  count: number | null; // null means masked (< minCellSize)
  masked: boolean;
}

export interface TransitionRow {
  f1Severity: string;
  f4Severity: string;
  count: number | null;
  masked: boolean;
}

/**
 * Aggregate MH screening severity distribution per KP group.
 * Cells with count < minCellSize are masked (count=null, masked=true).
 *
 * Uses RLS bypass (admin access). Bypass is audited.
 *
 * @param cohortId - Cohort to aggregate
 * @param phase - Phase to filter by ('F1' | 'F4')
 * @param actor - Admin actor performing the query (for audit)
 * @param minCellSize - Minimum cell size before masking (default 5)
 */
export async function aggregateSeverityPerKPGroup(
  cohortId: string,
  phase: string,
  actor: { id: string; role: UserRole; organizationId?: string },
  minCellSize = 5,
): Promise<AggregateRow[]> {
  log.info('Aggregate query — severity per KP group', {
    cohortId,
    phase,
    actorId: actor.id,
    actorRole: actor.role,
    minCellSize,
  });

  return withMHBypass(
    { id: actor.id, role: actor.role },
    'aggregate_query_severity_per_kp_group',
    async (tx) => {
      // Audit the aggregate access INSIDE the bypass transaction
      await recordMHAccess(tx, {
        actorId: actor.id,
        actorRole: actor.role,
        action: 'EXPORT_AGGREGATE',
        targetType: 'MHScreening',
        organizationId: actor.organizationId,
        metadata: { cohortId, phase, minCellSize },
      });

      const rows = await tx.$queryRaw<
        { kpGroupId: string | null; severity: string; phase: string; count: bigint }[]
      >`
        SELECT "kpGroupId", severity::text, phase::text, COUNT(*) AS count
        FROM "mh_screenings"
        WHERE "cohortId" = ${cohortId}
          AND "phase"::text = ${phase}
          AND "deletedAt" IS NULL
        GROUP BY "kpGroupId", severity, phase
        ORDER BY "kpGroupId" NULLS LAST, severity
      `;

      return rows.map((r: { kpGroupId: string | null; severity: string; phase: string; count: bigint }) => ({
        kpGroupId: r.kpGroupId,
        severity: r.severity,
        phase: r.phase,
        count: Number(r.count) >= minCellSize ? Number(r.count) : null,
        masked: Number(r.count) < minCellSize,
      }));
    },
  );
}

/**
 * Aggregate F1→F4 severity transitions for a cohort.
 * Compares severity at F1 vs F4 for users who completed both screenings.
 * Cell floor applies.
 */
export async function aggregateF1toF4Transition(
  cohortId: string,
  actor: { id: string; role: UserRole; organizationId?: string },
  minCellSize = 5,
): Promise<TransitionRow[]> {
  log.info('Aggregate query — F1→F4 transition', {
    cohortId,
    actorId: actor.id,
    actorRole: actor.role,
    minCellSize,
  });

  return withMHBypass(
    { id: actor.id, role: actor.role },
    'aggregate_query_f1_to_f4_transition',
    async (tx) => {
      await recordMHAccess(tx, {
        actorId: actor.id,
        actorRole: actor.role,
        action: 'EXPORT_AGGREGATE',
        targetType: 'MHScreening',
        organizationId: actor.organizationId,
        metadata: { cohortId, phase: 'F1_TO_F4', minCellSize },
      });

      const rows = await tx.$queryRaw<
        { f1Severity: string; f4Severity: string; count: bigint }[]
      >`
        SELECT
          f1.severity::text AS "f1Severity",
          f4.severity::text AS "f4Severity",
          COUNT(*) AS count
        FROM "mh_screenings" f1
        JOIN "mh_screenings" f4
          ON f4."userId" = f1."userId"
          AND f4."cohortId" = f1."cohortId"
          AND f4."instrument" = f1."instrument"
          AND f4."phase" = 'F4'
          AND f4."deletedAt" IS NULL
        WHERE f1."cohortId" = ${cohortId}
          AND f1."phase" = 'F1'
          AND f1."deletedAt" IS NULL
        GROUP BY f1.severity, f4.severity
        ORDER BY f1.severity, f4.severity
      `;

      return rows.map((r: { f1Severity: string; f4Severity: string; count: bigint }) => ({
        f1Severity: r.f1Severity,
        f4Severity: r.f4Severity,
        count: Number(r.count) >= minCellSize ? Number(r.count) : null,
        masked: Number(r.count) < minCellSize,
      }));
    },
  );
}
