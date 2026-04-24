/**
 * src/lib/triwulan/escalation/rules.ts
 * NAWASENA M14 — Escalation Rules Engine.
 *
 * 6 hardcoded rules with support for org-level threshold override
 * via Organization.settings.triwulanEscalationThresholds.
 */

import { EscalationRuleKey } from '@prisma/client';

export interface EscalationFlag {
  rule: EscalationRuleKey;
  severity: 'URGENT' | 'WARNING';
  details: string;
  metric: Record<string, unknown>;
}

export type EscalationSeverity = 'URGENT' | 'WARNING';

export interface EscalationRule {
  key: EscalationRuleKey;
  severity: EscalationSeverity;
  check(snapshot: Record<string, unknown>, thresholds: EscalationThresholds): EscalationFlag | null;
}

export interface EscalationThresholds {
  retentionMin: number;           // default 0.85
  forbiddenActsMax: number;       // default 0
  incidentsRedUnresolvedMax: number; // default 3
  anonHarassmentMax: number;      // default 0
  paktaSigningMin: number;        // default 0.90
  npsMin: number;                 // default 0
}

export const DEFAULT_THRESHOLDS: EscalationThresholds = {
  retentionMin: 0.85,
  forbiddenActsMax: 0,
  incidentsRedUnresolvedMax: 3,
  anonHarassmentMax: 0,
  paktaSigningMin: 0.90,
  npsMin: 0,
};

export const ESCALATION_RULES: EscalationRule[] = [
  {
    key: EscalationRuleKey.RETENTION_LOW,
    severity: 'URGENT',
    check(snapshot, thresholds) {
      const kpi = snapshot.kpi as Record<string, { value: number } | null> | null;
      const retention = kpi?.retention?.value;
      if (retention === null || retention === undefined) return null;
      if (retention < thresholds.retentionMin) {
        return {
          rule: EscalationRuleKey.RETENTION_LOW,
          severity: 'URGENT',
          details: `Retention ${(retention * 100).toFixed(1)}% di bawah threshold ${(thresholds.retentionMin * 100).toFixed(0)}%`,
          metric: { actual: retention, threshold: thresholds.retentionMin },
        };
      }
      return null;
    },
  },
  {
    key: EscalationRuleKey.FORBIDDEN_ACTS_VIOLATION,
    severity: 'URGENT',
    check(snapshot, thresholds) {
      const acts = snapshot.forbiddenActs as { totalViolations?: number } | null;
      const total = acts?.totalViolations ?? 0;
      if (total > thresholds.forbiddenActsMax) {
        return {
          rule: EscalationRuleKey.FORBIDDEN_ACTS_VIOLATION,
          severity: 'URGENT',
          details: `${total} pelanggaran tindakan terlarang terdeteksi (threshold: ${thresholds.forbiddenActsMax})`,
          metric: { actual: total, threshold: thresholds.forbiddenActsMax },
        };
      }
      return null;
    },
  },
  {
    key: EscalationRuleKey.INCIDENTS_RED_UNRESOLVED,
    severity: 'URGENT',
    check(snapshot, thresholds) {
      const incidents = snapshot.incidents as {
        unresolvedRedCount?: number;
      } | null;
      const count = incidents?.unresolvedRedCount ?? 0;
      if (count > thresholds.incidentsRedUnresolvedMax) {
        return {
          rule: EscalationRuleKey.INCIDENTS_RED_UNRESOLVED,
          severity: 'URGENT',
          details: `${count} insiden RED belum diselesaikan (threshold: ${thresholds.incidentsRedUnresolvedMax})`,
          metric: { actual: count, threshold: thresholds.incidentsRedUnresolvedMax },
        };
      }
      return null;
    },
  },
  {
    key: EscalationRuleKey.ANON_HARASSMENT_PRESENT,
    severity: 'URGENT',
    check(snapshot, thresholds) {
      const anon = snapshot.anonReports as {
        byCategory?: { HARASSMENT?: number };
      } | null;
      const harassmentCount = anon?.byCategory?.HARASSMENT ?? 0;
      if (harassmentCount > thresholds.anonHarassmentMax) {
        return {
          rule: EscalationRuleKey.ANON_HARASSMENT_PRESENT,
          severity: 'URGENT',
          details: `${harassmentCount} laporan anonim kategori harassment terdeteksi (threshold: ${thresholds.anonHarassmentMax})`,
          metric: { actual: harassmentCount, threshold: thresholds.anonHarassmentMax },
        };
      }
      return null;
    },
  },
  {
    key: EscalationRuleKey.PAKTA_SIGNING_LOW,
    severity: 'WARNING',
    check(snapshot, thresholds) {
      const compliance = snapshot.compliance as {
        paktaSigningRate?: Record<string, { rate: number }>;
      } | null;
      const rates = compliance?.paktaSigningRate;
      if (!rates) return null;

      for (const [role, data] of Object.entries(rates)) {
        if (data.rate < thresholds.paktaSigningMin) {
          return {
            rule: EscalationRuleKey.PAKTA_SIGNING_LOW,
            severity: 'WARNING',
            details: `Signing rate ${role} ${(data.rate * 100).toFixed(1)}% di bawah threshold ${(thresholds.paktaSigningMin * 100).toFixed(0)}%`,
            metric: { role, actual: data.rate, threshold: thresholds.paktaSigningMin },
          };
        }
      }
      return null;
    },
  },
  {
    key: EscalationRuleKey.NPS_NEGATIVE,
    severity: 'WARNING',
    check(snapshot, thresholds) {
      const kpi = snapshot.kpi as Record<string, { value: number } | null> | null;
      const nps = kpi?.npsAvg?.value;
      if (nps === null || nps === undefined) return null;
      if (nps < thresholds.npsMin) {
        return {
          rule: EscalationRuleKey.NPS_NEGATIVE,
          severity: 'WARNING',
          details: `NPS rata-rata ${nps.toFixed(1)} di bawah threshold ${thresholds.npsMin}`,
          metric: { actual: nps, threshold: thresholds.npsMin },
        };
      }
      return null;
    },
  },
];

/**
 * Parse threshold overrides from Organization.settings.
 * Unknown keys are ignored; missing keys fall back to defaults.
 */
export function parseThresholds(
  orgSettings: Record<string, unknown> | null | undefined
): EscalationThresholds {
  const custom = (orgSettings?.triwulanEscalationThresholds ?? {}) as Partial<EscalationThresholds>;
  return { ...DEFAULT_THRESHOLDS, ...custom };
}
