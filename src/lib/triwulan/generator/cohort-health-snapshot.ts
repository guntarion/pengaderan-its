/**
 * src/lib/triwulan/generator/cohort-health-snapshot.ts
 * NAWASENA M14 — Cohort Health Snapshot sub-generator.
 *
 * Queries User counts by role and status for the cohort.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { UserRole, UserStatus } from '@prisma/client';

const log = createLogger('m14/generator/cohort-health-snapshot');

export interface CohortHealthSnapshotData {
  activeCount: number;
  archivedCount: number;
  roleDistribution: {
    MABA: number;
    KP: number;
    KASUH: number;
    OC: number;
    SC: number;
    PEMBINA: number;
    BLM: number;
    [key: string]: number;
  };
}

export interface CohortHealthSnapshotResult {
  data: CohortHealthSnapshotData | null;
  missing?: string[];
}

export async function generateCohortHealthSnapshot(
  cohortId: string,
  _quarterStart: Date,
  _quarterEnd: Date
): Promise<CohortHealthSnapshotResult> {
  try {
    log.info('Generating cohort health snapshot', { cohortId });

    const [activeCount, archivedCount, roleCounts] = await Promise.all([
      prisma.user.count({
        where: {
          currentCohortId: cohortId,
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.count({
        where: {
          currentCohortId: cohortId,
          status: UserStatus.DEACTIVATED,
        },
      }),
      prisma.user.groupBy({
        by: ['role'],
        where: { currentCohortId: cohortId },
        _count: { id: true },
      }),
    ]);

    const roleDistribution: CohortHealthSnapshotData['roleDistribution'] = {
      MABA: 0,
      KP: 0,
      KASUH: 0,
      OC: 0,
      SC: 0,
      PEMBINA: 0,
      BLM: 0,
    };

    for (const row of roleCounts) {
      roleDistribution[row.role] = row._count.id;
    }

    const data: CohortHealthSnapshotData = {
      activeCount,
      archivedCount,
      roleDistribution,
    };

    log.info('Cohort health snapshot generated', {
      cohortId,
      activeCount,
      archivedCount,
    });
    return { data };
  } catch (err) {
    log.error('Cohort health snapshot failed', { error: err, cohortId });
    return { data: null, missing: ['cohortHealth'] };
  }
}
