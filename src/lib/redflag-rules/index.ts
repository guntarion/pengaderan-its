/**
 * src/lib/redflag-rules/index.ts
 * Rule registry for M13 Red Flag Rules Engine.
 * All 8 rules registered here.
 */

import type { RedFlagRule } from './types';
import { pulseLow3DRule } from './pulse-low-3d';
import { journalDormant14DRule } from './journal-dormant-14d';
import { kpDebriefOverdueRule } from './kp-debrief-overdue';
import { paktaUnsigned7DRule } from './pakta-unsigned-7d';
import { incidentUnassignedRule } from './incident-unassigned';
import { anonReportRedRule } from './anon-report-red';
import { moodCohortDropRule } from './mood-cohort-drop';
import { npsDropRule } from './nps-drop';

export const RULES: RedFlagRule[] = [
  pulseLow3DRule,
  journalDormant14DRule,
  kpDebriefOverdueRule,
  paktaUnsigned7DRule,
  incidentUnassignedRule,
  anonReportRedRule,
  moodCohortDropRule,
  npsDropRule,
];

export type { RedFlagRule, RuleContext, RuleHit } from './types';
