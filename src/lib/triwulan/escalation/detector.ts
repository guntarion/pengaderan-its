/**
 * src/lib/triwulan/escalation/detector.ts
 * NAWASENA M14 — Escalation Detector.
 *
 * Applies all escalation rules against a snapshot and determines
 * the overall escalation level.
 */

import { TriwulanEscalationLevel } from '@prisma/client';
import { ESCALATION_RULES, EscalationFlag, EscalationThresholds, parseThresholds } from './rules';
import { createLogger } from '@/lib/logger';

const log = createLogger('m14/escalation/detector');

export interface DetectionResult {
  flags: EscalationFlag[];
  level: TriwulanEscalationLevel;
}

/**
 * Detect escalations from a snapshot.
 *
 * @param snapshot - The dataSnapshotJsonb object
 * @param orgSettings - Organization.settings (for threshold overrides)
 */
export function detectEscalations(
  snapshot: Record<string, unknown>,
  orgSettings?: Record<string, unknown> | null
): DetectionResult {
  const thresholds: EscalationThresholds = parseThresholds(orgSettings);
  const flags: EscalationFlag[] = [];

  for (const rule of ESCALATION_RULES) {
    try {
      const flag = rule.check(snapshot, thresholds);
      if (flag) {
        flags.push(flag);
        log.info('Escalation flag detected', {
          rule: flag.rule,
          severity: flag.severity,
          details: flag.details,
        });
      }
    } catch (err) {
      log.error('Escalation rule check failed', { error: err, rule: rule.key });
      // Don't let a broken rule stop the entire detection
    }
  }

  // Determine level: URGENT if any URGENT flag, WARNING if any WARNING, else NONE
  let level: TriwulanEscalationLevel = TriwulanEscalationLevel.NONE;
  for (const flag of flags) {
    if (flag.severity === 'URGENT') {
      level = TriwulanEscalationLevel.URGENT;
      break; // URGENT is highest — no need to continue
    }
    if (flag.severity === 'WARNING') {
      level = TriwulanEscalationLevel.WARNING;
    }
  }

  log.info('Escalation detection complete', {
    flagCount: flags.length,
    level,
    urgentCount: flags.filter((f) => f.severity === 'URGENT').length,
    warningCount: flags.filter((f) => f.severity === 'WARNING').length,
  });

  return { flags, level };
}
