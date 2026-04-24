/**
 * src/lib/__tests__/triwulan-escalation-rules.test.ts
 * NAWASENA M14 — Unit tests for escalation rules engine and detector.
 */

import { describe, it, expect } from 'vitest';
import { ESCALATION_RULES, DEFAULT_THRESHOLDS, parseThresholds } from '../triwulan/escalation/rules';
import { detectEscalations } from '../triwulan/escalation/detector';
import { EscalationRuleKey, TriwulanEscalationLevel } from '@prisma/client';

// ---------------------------------------------------------------------------
// Helper: empty clean snapshot
// ---------------------------------------------------------------------------
function emptySnapshot(): Record<string, unknown> {
  return {
    kpi: null,
    incidents: null,
    anonReports: null,
    forbiddenActs: null,
    compliance: null,
  };
}

// ---------------------------------------------------------------------------
// RETENTION_LOW rule
// ---------------------------------------------------------------------------
describe('ESCALATION_RULES — RETENTION_LOW', () => {
  const rule = ESCALATION_RULES.find((r) => r.key === EscalationRuleKey.RETENTION_LOW)!;
  const thresholds = DEFAULT_THRESHOLDS;

  it('fires when retention < 0.85', () => {
    const snapshot = { kpi: { retention: { value: 0.80 } } };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).not.toBeNull();
    expect(flag!.rule).toBe(EscalationRuleKey.RETENTION_LOW);
    expect(flag!.severity).toBe('URGENT');
  });

  it('does not fire when retention >= 0.85', () => {
    const snapshot = { kpi: { retention: { value: 0.90 } } };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).toBeNull();
  });

  it('does not fire when kpi is null', () => {
    const flag = rule.check({ kpi: null }, thresholds);
    expect(flag).toBeNull();
  });

  it('does not fire when retention is undefined', () => {
    const flag = rule.check({ kpi: {} }, thresholds);
    expect(flag).toBeNull();
  });

  it('respects org-level override threshold', () => {
    const customThresholds = { ...DEFAULT_THRESHOLDS, retentionMin: 0.70 };
    // 0.75 < 0.85 (default) but > 0.70 (override) → no flag
    const snapshot = { kpi: { retention: { value: 0.75 } } };
    const flag = rule.check(snapshot, customThresholds);
    expect(flag).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FORBIDDEN_ACTS_VIOLATION rule
// ---------------------------------------------------------------------------
describe('ESCALATION_RULES — FORBIDDEN_ACTS_VIOLATION', () => {
  const rule = ESCALATION_RULES.find((r) => r.key === EscalationRuleKey.FORBIDDEN_ACTS_VIOLATION)!;
  const thresholds = DEFAULT_THRESHOLDS;

  it('fires when totalViolations > 0 (default threshold)', () => {
    const snapshot = { forbiddenActs: { totalViolations: 1 } };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('URGENT');
  });

  it('does not fire when totalViolations === 0', () => {
    const snapshot = { forbiddenActs: { totalViolations: 0 } };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).toBeNull();
  });

  it('does not fire when forbiddenActs is null', () => {
    const flag = rule.check({ forbiddenActs: null }, thresholds);
    expect(flag).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// INCIDENTS_RED_UNRESOLVED rule
// ---------------------------------------------------------------------------
describe('ESCALATION_RULES — INCIDENTS_RED_UNRESOLVED', () => {
  const rule = ESCALATION_RULES.find((r) => r.key === EscalationRuleKey.INCIDENTS_RED_UNRESOLVED)!;
  const thresholds = DEFAULT_THRESHOLDS; // incidentsRedUnresolvedMax = 3

  it('fires when unresolvedRedCount > 3', () => {
    const snapshot = { incidents: { unresolvedRedCount: 4 } };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('URGENT');
  });

  it('does not fire when unresolvedRedCount === 3 (at threshold)', () => {
    const snapshot = { incidents: { unresolvedRedCount: 3 } };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).toBeNull();
  });

  it('does not fire when incidents is null', () => {
    const flag = rule.check({ incidents: null }, thresholds);
    expect(flag).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ANON_HARASSMENT_PRESENT rule
// ---------------------------------------------------------------------------
describe('ESCALATION_RULES — ANON_HARASSMENT_PRESENT', () => {
  const rule = ESCALATION_RULES.find((r) => r.key === EscalationRuleKey.ANON_HARASSMENT_PRESENT)!;
  const thresholds = DEFAULT_THRESHOLDS; // anonHarassmentMax = 0

  it('fires when HARASSMENT count > 0', () => {
    const snapshot = { anonReports: { byCategory: { HARASSMENT: 2 } } };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('URGENT');
  });

  it('does not fire when HARASSMENT count === 0', () => {
    const snapshot = { anonReports: { byCategory: { HARASSMENT: 0 } } };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).toBeNull();
  });

  it('does not fire when byCategory is missing', () => {
    const snapshot = { anonReports: { byCategory: {} } };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PAKTA_SIGNING_LOW rule
// ---------------------------------------------------------------------------
describe('ESCALATION_RULES — PAKTA_SIGNING_LOW', () => {
  const rule = ESCALATION_RULES.find((r) => r.key === EscalationRuleKey.PAKTA_SIGNING_LOW)!;
  const thresholds = DEFAULT_THRESHOLDS; // paktaSigningMin = 0.90

  it('fires when any role rate < 0.90', () => {
    const snapshot = {
      compliance: { paktaSigningRate: { PESERTA: { rate: 0.85 } } },
    };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('WARNING');
  });

  it('does not fire when all rates >= 0.90', () => {
    const snapshot = {
      compliance: { paktaSigningRate: { PESERTA: { rate: 0.95 }, SC: { rate: 1.0 } } },
    };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).toBeNull();
  });

  it('does not fire when compliance is null', () => {
    const flag = rule.check({ compliance: null }, thresholds);
    expect(flag).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// NPS_NEGATIVE rule
// ---------------------------------------------------------------------------
describe('ESCALATION_RULES — NPS_NEGATIVE', () => {
  const rule = ESCALATION_RULES.find((r) => r.key === EscalationRuleKey.NPS_NEGATIVE)!;
  const thresholds = DEFAULT_THRESHOLDS; // npsMin = 0

  it('fires when npsAvg < 0', () => {
    const snapshot = { kpi: { npsAvg: { value: -5 } } };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('WARNING');
  });

  it('does not fire when npsAvg >= 0', () => {
    const snapshot = { kpi: { npsAvg: { value: 0 } } };
    const flag = rule.check(snapshot, thresholds);
    expect(flag).toBeNull();
  });

  it('does not fire when npsAvg is undefined', () => {
    const flag = rule.check({ kpi: {} }, thresholds);
    expect(flag).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseThresholds()
// ---------------------------------------------------------------------------
describe('parseThresholds()', () => {
  it('returns defaults when orgSettings is null', () => {
    const result = parseThresholds(null);
    expect(result).toEqual(DEFAULT_THRESHOLDS);
  });

  it('returns defaults when orgSettings has no triwulanEscalationThresholds', () => {
    const result = parseThresholds({ someOtherKey: 'value' });
    expect(result).toEqual(DEFAULT_THRESHOLDS);
  });

  it('merges org-level override with defaults', () => {
    const result = parseThresholds({
      triwulanEscalationThresholds: { retentionMin: 0.70, forbiddenActsMax: 2 },
    });
    expect(result.retentionMin).toBe(0.70);
    expect(result.forbiddenActsMax).toBe(2);
    // Other defaults unchanged
    expect(result.paktaSigningMin).toBe(DEFAULT_THRESHOLDS.paktaSigningMin);
    expect(result.anonHarassmentMax).toBe(DEFAULT_THRESHOLDS.anonHarassmentMax);
  });
});

// ---------------------------------------------------------------------------
// detectEscalations() — integration-level
// ---------------------------------------------------------------------------
describe('detectEscalations()', () => {
  it('returns NONE with empty snapshot', () => {
    const result = detectEscalations(emptySnapshot());
    expect(result.level).toBe(TriwulanEscalationLevel.NONE);
    expect(result.flags).toHaveLength(0);
  });

  it('returns URGENT when any URGENT rule fires', () => {
    const snapshot = {
      ...emptySnapshot(),
      forbiddenActs: { totalViolations: 1 }, // URGENT
    };
    const result = detectEscalations(snapshot);
    expect(result.level).toBe(TriwulanEscalationLevel.URGENT);
    expect(result.flags.some((f) => f.severity === 'URGENT')).toBe(true);
  });

  it('returns WARNING when only WARNING rules fire', () => {
    const snapshot = {
      ...emptySnapshot(),
      kpi: { npsAvg: { value: -10 } }, // WARNING only
    };
    const result = detectEscalations(snapshot);
    expect(result.level).toBe(TriwulanEscalationLevel.WARNING);
    expect(result.flags.every((f) => f.severity === 'WARNING')).toBe(true);
  });

  it('returns URGENT even when WARNING rules also fire', () => {
    const snapshot = {
      ...emptySnapshot(),
      forbiddenActs: { totalViolations: 2 }, // URGENT
      kpi: { npsAvg: { value: -5 } },       // WARNING
    };
    const result = detectEscalations(snapshot);
    expect(result.level).toBe(TriwulanEscalationLevel.URGENT);
  });

  it('collects multiple flags', () => {
    const snapshot = {
      ...emptySnapshot(),
      kpi: { retention: { value: 0.70 }, npsAvg: { value: -1 } },
    };
    const result = detectEscalations(snapshot);
    // RETENTION_LOW + NPS_NEGATIVE should both fire
    expect(result.flags.length).toBeGreaterThanOrEqual(2);
  });

  it('respects org threshold overrides passed via orgSettings', () => {
    const snapshot = {
      ...emptySnapshot(),
      kpi: { retention: { value: 0.75 } },
    };
    // With default threshold (0.85) this would fire, but with override (0.70) it should not
    const orgSettings = { triwulanEscalationThresholds: { retentionMin: 0.70 } };
    const result = detectEscalations(snapshot, orgSettings);
    expect(result.flags.find((f) => f.rule === EscalationRuleKey.RETENTION_LOW)).toBeUndefined();
  });

  it('does not throw when a snapshot field is missing', () => {
    // Should gracefully handle missing keys without throwing
    expect(() => detectEscalations({})).not.toThrow();
  });
});
