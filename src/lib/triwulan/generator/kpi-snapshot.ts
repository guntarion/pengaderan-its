/**
 * src/lib/triwulan/generator/kpi-snapshot.ts
 * NAWASENA M14 — KPI Snapshot sub-generator.
 *
 * Queries KPISignal from M13 for QUARTERLY and MONTHLY periods,
 * scoped to cohortId + date range. Returns structured kpi snapshot.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { KPIPeriod } from '@prisma/client';

const log = createLogger('m14/generator/kpi-snapshot');

export interface KpiSnapshotData {
  retention: { value: number; threshold: number; period: string } | null;
  npsAvg: { value: number; period: string; trend: number[] } | null;
  pulseAvg: { value: number; period: string; trend: number[] } | null;
  journalRate: { value: number; period: string } | null;
  attendanceRate: { value: number; period: string } | null;
  passportCompletionRate: { value: number; period: string } | null;
}

export interface KpiSnapshotResult {
  data: KpiSnapshotData | null;
  missing?: string[];
}

// KPIDef IDs that map to each snapshot field (based on M02 master data keys)
// These are natural IDs like "KPI-K4.05-1" — adjust to match actual seeded data
const KPI_KEY_PATTERNS: Record<keyof KpiSnapshotData, string[]> = {
  retention: ['retention', 'RETENTION', 'retensi'],
  npsAvg: ['nps', 'NPS', 'net promoter'],
  pulseAvg: ['pulse', 'PULSE', 'mood'],
  journalRate: ['journal', 'JOURNAL'],
  attendanceRate: ['attendance', 'ATTENDANCE', 'kehadiran'],
  passportCompletionRate: ['passport', 'PASSPORT'],
};

export async function generateKpiSnapshot(
  cohortId: string,
  quarterStart: Date,
  quarterEnd: Date
): Promise<KpiSnapshotResult> {
  try {
    log.info('Generating KPI snapshot', { cohortId, quarterStart, quarterEnd });

    const signals = await prisma.kPISignal.findMany({
      where: {
        cohortId,
        period: { in: [KPIPeriod.QUARTERLY, KPIPeriod.MONTHLY] },
        computedAt: { gte: quarterStart, lte: quarterEnd },
      },
      include: { kpiDef: true },
      orderBy: { computedAt: 'desc' },
    });

    const missing: string[] = [];

    // Helper to find signal by text patterns
    const findByPatterns = (patterns: string[]) => {
      return signals.find((s) =>
        patterns.some((p) => {
          const id = s.kpiDef.id.toLowerCase();
          const text = s.kpiDef.text.toLowerCase();
          const pattern = p.toLowerCase();
          return id.includes(pattern) || text.includes(pattern);
        })
      ) ?? null;
    };

    // Build monthly trend arrays
    const monthlyTrends = new Map<string, number[]>();
    for (const signal of signals) {
      if (signal.period === KPIPeriod.MONTHLY) {
        const arr = monthlyTrends.get(signal.kpiDefId) ?? [];
        arr.push(signal.value);
        monthlyTrends.set(signal.kpiDefId, arr);
      }
    }

    const retentionSignal = findByPatterns(KPI_KEY_PATTERNS.retention);
    const npsSignal = findByPatterns(KPI_KEY_PATTERNS.npsAvg);
    const pulseSignal = findByPatterns(KPI_KEY_PATTERNS.pulseAvg);
    const journalSignal = findByPatterns(KPI_KEY_PATTERNS.journalRate);
    const attendanceSignal = findByPatterns(KPI_KEY_PATTERNS.attendanceRate);
    const passportSignal = findByPatterns(KPI_KEY_PATTERNS.passportCompletionRate);

    if (!retentionSignal) missing.push('kpi.retention');
    if (!npsSignal) missing.push('kpi.npsAvg');
    if (!pulseSignal) missing.push('kpi.pulseAvg');

    const data: KpiSnapshotData = {
      retention: retentionSignal
        ? { value: retentionSignal.value, threshold: 0.85, period: 'QUARTERLY' }
        : null,
      npsAvg: npsSignal
        ? {
            value: npsSignal.value,
            period: 'MONTHLY',
            trend: (monthlyTrends.get(npsSignal.kpiDefId) ?? []).slice(0, 3).reverse(),
          }
        : null,
      pulseAvg: pulseSignal
        ? {
            value: pulseSignal.value,
            period: 'DAILY',
            trend: (monthlyTrends.get(pulseSignal.kpiDefId) ?? []).slice(0, 3).reverse(),
          }
        : null,
      journalRate: journalSignal ? { value: journalSignal.value, period: 'WEEKLY' } : null,
      attendanceRate: attendanceSignal ? { value: attendanceSignal.value, period: 'MONTHLY' } : null,
      passportCompletionRate: passportSignal ? { value: passportSignal.value, period: 'QUARTERLY' } : null,
    };

    log.info('KPI snapshot generated', {
      cohortId,
      signalCount: signals.length,
      missingCount: missing.length,
    });
    return { data, missing: missing.length > 0 ? missing : undefined };
  } catch (err) {
    log.error('KPI snapshot failed', { error: err, cohortId });
    return { data: null, missing: ['kpi'] };
  }
}
