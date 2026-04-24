/**
 * src/lib/redflag-rules/types.ts
 * Red flag rules engine type definitions for M13.
 */

import { PrismaClient, RedFlagSeverity, RedFlagType, UserRole } from '@prisma/client';

// Logger interface (subset used by rules)
export interface RuleLogger {
  info(message: string, ctx?: Record<string, unknown>): void;
  warn(message: string, ctx?: Record<string, unknown>): void;
  error(message: string, ctx?: Record<string, unknown>): void;
  debug(message: string, ctx?: Record<string, unknown>): void;
}

/** Context passed to each rule's evaluate() function */
export interface RuleContext {
  cohortId: string;
  organizationId: string;
  prisma: PrismaClient;
  log: RuleLogger;
}

/** A single rule hit — one alert to create/update */
export interface RuleHit {
  targetUserId?: string | null;
  targetResourceId?: string | null;
  title: string;
  description?: string;
  severity: RedFlagSeverity;
  targetRoles: UserRole[];
  targetUrl: string;
  metadata?: Record<string, unknown>;
}

/** Interface each red flag rule must implement */
export interface RedFlagRule {
  type: RedFlagType;
  name: string;
  defaultSeverity: RedFlagSeverity;
  enabled: boolean;
  targetRoles: UserRole[];
  /**
   * Evaluate the rule for the given cohort.
   * Returns an array of RuleHit objects (empty = no issues found).
   */
  evaluate(ctx: RuleContext): Promise<RuleHit[]>;
}
