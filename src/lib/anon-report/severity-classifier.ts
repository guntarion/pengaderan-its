/**
 * src/lib/anon-report/severity-classifier.ts
 * NAWASENA M12 — Severity auto-classification (pure TypeScript function).
 *
 * Logic:
 *   1. Start with reporterSeverity (or GREEN if not provided)
 *   2. Apply keyword matching → RED if severe keyword found
 *   3. Apply category floor: HARASSMENT minimum YELLOW
 *   4. Determine autoEscalate: RED || HARASSMENT → true
 *
 * BLM can override severity post-submission (tracked via AnonReportAccessLog SEVERITY_OVERRIDE).
 *
 * Keyword list: loaded from DB config (AnonReportConfig key='severe_keywords').
 * Default list used if DB unavailable.
 */

import { AnonCategory, AnonSeverity } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('anon-severity-classifier');

/**
 * Default severe keywords (Bahasa Indonesia).
 * SUPERADMIN can update via AnonReportConfig table in production.
 */
export const DEFAULT_SEVERE_KEYWORDS: string[] = [
  'pelecehan',
  'pelecehan seksual',
  'seksual',
  'ancaman',
  'mengancam',
  'senjata',
  'pisau',
  'bunuh diri',
  'self-harm',
  'menyakiti diri',
  'kekerasan fisik',
  'pukul',
  'tendang',
  'pemerkosaan',
  'rudapaksa',
];

export interface SeverityClassificationResult {
  finalSeverity: AnonSeverity;
  autoEscalate: boolean;
  reason: string[];
}

/**
 * Classify the severity of a report based on content, reporter indication, and category.
 *
 * @param body - The report body text
 * @param reporterSeverity - Optional severity indicated by reporter
 * @param category - The report category
 * @param customSevereKeywords - Optional custom keyword list from DB config
 * @returns Classification result with severity, escalation flag, and reasons
 */
export function classifySeverity(
  body: string,
  reporterSeverity: AnonSeverity | null | undefined,
  category: AnonCategory,
  customSevereKeywords?: string[],
): SeverityClassificationResult {
  const reasons: string[] = [];

  // Start with reporter's indication or default GREEN
  let severity: AnonSeverity = reporterSeverity ?? AnonSeverity.GREEN;

  const keywords = customSevereKeywords ?? DEFAULT_SEVERE_KEYWORDS;
  const normalized = body.toLowerCase();

  // Rule 1: Keyword heuristic
  const matched = keywords.filter((kw) => normalized.includes(kw.toLowerCase()));
  if (matched.length > 0) {
    // Escalate to RED for any severe keyword match
    severity = AnonSeverity.RED;
    reasons.push(`keyword match: ${matched.slice(0, 3).join(', ')}${matched.length > 3 ? '...' : ''}`);
    log.debug('Severity elevated to RED by keyword match', {
      matchCount: matched.length,
    });
  }

  // Rule 2: Category-based floor
  if (category === AnonCategory.HARASSMENT && severity === AnonSeverity.GREEN) {
    severity = AnonSeverity.YELLOW;
    reasons.push('HARASSMENT category minimum YELLOW');
  }

  // Rule 3: Auto-escalate trigger
  // RED severity OR HARASSMENT category → escalate to Satgas
  const autoEscalate = severity === AnonSeverity.RED || category === AnonCategory.HARASSMENT;

  return {
    finalSeverity: severity,
    autoEscalate,
    reason: reasons,
  };
}
