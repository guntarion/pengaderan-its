/**
 * src/lib/triwulan/generator/pakta-snapshot.ts
 * NAWASENA M14 — Pakta Signature Snapshot sub-generator.
 *
 * Queries PaktaSignature from M01 joined with User role.
 * Calculates signing rate per role for the cohort.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { UserRole } from '@prisma/client';

const log = createLogger('m14/generator/pakta-snapshot');

export interface PaktaRoleRate {
  rate: number;
  signed: number;
  total: number;
}

export interface PaktaSnapshotData {
  paktaSigningRate: {
    MABA: PaktaRoleRate;
    KP: PaktaRoleRate;
    KASUH: PaktaRoleRate;
    OC: PaktaRoleRate;
    SC: PaktaRoleRate;
    PEMBINA: PaktaRoleRate;
  };
}

export interface PaktaSnapshotResult {
  data: PaktaSnapshotData | null;
  missing?: string[];
}

const TARGET_ROLES: UserRole[] = [
  UserRole.MABA,
  UserRole.KP,
  UserRole.KASUH,
  UserRole.OC,
  UserRole.SC,
  UserRole.PEMBINA,
];

export async function generatePaktaSnapshot(
  cohortId: string,
  _quarterStart: Date,
  _quarterEnd: Date
): Promise<PaktaSnapshotResult> {
  try {
    log.info('Generating pakta snapshot', { cohortId });

    // Count all users in cohort by role
    const userCountsByRole = await prisma.user.groupBy({
      by: ['role'],
      where: {
        currentCohortId: cohortId,
        role: { in: TARGET_ROLES },
      },
      _count: { id: true },
    });

    // Count signed pakta per user role (join through user)
    const signedUsers = await prisma.paktaSignature.findMany({
      where: {
        cohortId,
        user: { role: { in: TARGET_ROLES } },
      },
      select: {
        userId: true,
        user: { select: { role: true } },
      },
      distinct: ['userId'],
    });

    const totalByRole = new Map<UserRole, number>();
    for (const row of userCountsByRole) {
      totalByRole.set(row.role, row._count.id);
    }

    const signedByRole = new Map<UserRole, number>();
    for (const sig of signedUsers) {
      const role = sig.user.role;
      signedByRole.set(role, (signedByRole.get(role) ?? 0) + 1);
    }

    const makeRate = (role: UserRole): PaktaRoleRate => {
      const total = totalByRole.get(role) ?? 0;
      const signed = signedByRole.get(role) ?? 0;
      const rate = total > 0 ? Math.min(signed / total, 1.0) : 0;
      return { rate, signed, total };
    };

    const data: PaktaSnapshotData = {
      paktaSigningRate: {
        MABA: makeRate(UserRole.MABA),
        KP: makeRate(UserRole.KP),
        KASUH: makeRate(UserRole.KASUH),
        OC: makeRate(UserRole.OC),
        SC: makeRate(UserRole.SC),
        PEMBINA: makeRate(UserRole.PEMBINA),
      },
    };

    log.info('Pakta snapshot generated', { cohortId });
    return { data };
  } catch (err) {
    log.error('Pakta snapshot failed', { error: err, cohortId });
    return { data: null, missing: ['compliance.paktaSigningRate'] };
  }
}
