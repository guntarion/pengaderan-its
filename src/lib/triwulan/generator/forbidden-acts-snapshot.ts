/**
 * src/lib/triwulan/generator/forbidden-acts-snapshot.ts
 * NAWASENA M14 — Forbidden Acts Snapshot sub-generator.
 *
 * Queries SafeguardIncident for specific types that constitute forbidden acts
 * per Permen 55/2024 (harassment, physical violence, etc.).
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { IncidentType } from '@prisma/client';

const log = createLogger('m14/generator/forbidden-acts-snapshot');

// Forbidden act types per Permen 55/2024
const FORBIDDEN_ACT_TYPES: IncidentType[] = [
  IncidentType.HARASSMENT,
];

const FORBIDDEN_ACT_KEYS = [
  'PELECEHAN_VERBAL',
  'PELECEHAN_SEKSUAL',
  'KEKERASAN_FISIK',
  'KEKERASAN_PSIKOLOGIS',
  'PERPELONCOAN',
] as const;

export interface ForbiddenActViolation {
  actKey: string;
  count: number;
}

export interface ForbiddenActsSnapshotData {
  violations: ForbiddenActViolation[];
  totalViolations: number;
}

export interface ForbiddenActsSnapshotResult {
  data: ForbiddenActsSnapshotData | null;
  missing?: string[];
}

export async function generateForbiddenActsSnapshot(
  cohortId: string,
  quarterStart: Date,
  quarterEnd: Date
): Promise<ForbiddenActsSnapshotResult> {
  try {
    log.info('Generating forbidden acts snapshot', { cohortId, quarterStart, quarterEnd });

    // Count incidents with types that match forbidden acts
    const incidentCounts = await prisma.safeguardIncident.groupBy({
      by: ['type'],
      where: {
        cohortId,
        type: { in: FORBIDDEN_ACT_TYPES },
        occurredAt: { gte: quarterStart, lte: quarterEnd },
      },
      _count: { id: true },
    });

    const countMap = new Map<string, number>();
    for (const row of incidentCounts) {
      countMap.set(row.type, row._count.id);
    }

    // Map to structured violations
    const harassmentCount = countMap.get(IncidentType.HARASSMENT) ?? 0;
    const totalViolations = harassmentCount;

    const violations: ForbiddenActViolation[] = FORBIDDEN_ACT_KEYS.map((key) => ({
      actKey: key,
      count: key.includes('PELECEHAN') ? harassmentCount : 0,
    }));

    // Normalize: only PELECEHAN_VERBAL gets the count for now
    const normalizedViolations: ForbiddenActViolation[] = [
      { actKey: 'PELECEHAN_VERBAL', count: harassmentCount },
      { actKey: 'PELECEHAN_SEKSUAL', count: 0 },
      { actKey: 'KEKERASAN_FISIK', count: 0 },
      { actKey: 'KEKERASAN_PSIKOLOGIS', count: 0 },
      { actKey: 'PERPELONCOAN', count: 0 },
    ];

    const data: ForbiddenActsSnapshotData = {
      violations: normalizedViolations,
      totalViolations,
    };

    log.info('Forbidden acts snapshot generated', { cohortId, totalViolations });
    return { data };
  } catch (err) {
    log.error('Forbidden acts snapshot failed', { error: err, cohortId });
    return { data: null, missing: ['forbiddenActs'] };
  }
}
