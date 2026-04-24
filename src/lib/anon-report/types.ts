/**
 * src/lib/anon-report/types.ts
 * NAWASENA M12 — Shared TypeScript types for the anonymous channel module.
 *
 * These types are used across lib files, API routes, and components.
 * Keep this file free of Prisma imports where possible to allow
 * client-side usage.
 */

import { AnonCategory, AnonSeverity, AnonStatus, AnonAccessAction } from '@prisma/client';

// ============================================================
// Aggregate
// ============================================================

/** One row in an aggregated anon-report summary (cell-floor applied). */
export interface AggregateRow {
  category: AnonCategory;
  severity: AnonSeverity;
  status: AnonStatus;
  /** null when count < minCellSize (masked) */
  count: number | null;
  masked: boolean;
}

/** Totals companion to AggregateRow[] */
export interface AggregateTotals {
  submitted: number;
  escalated: number;
  resolved: number;
}

// ============================================================
// Escalation
// ============================================================

/** Minimal report payload passed to escalation — NO body, NO attachment */
export interface EscalationPayload {
  reportId: string;
  trackingCode: string;
  category: AnonCategory;
  severity: AnonSeverity;
  cohortName: string;
  severityReason: string[];
}

// ============================================================
// Receivers
// ============================================================

export interface ReceiverUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
}

// ============================================================
// Access Log
// ============================================================

export interface AccessLogEntry {
  id: string;
  reportId: string;
  actorId: string;
  actorRole: string;
  action: AnonAccessAction;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}

// ============================================================
// Report (dashboard view — no full body for list)
// ============================================================

export interface AnonReportListItem {
  id: string;
  /** Masked: "NW-****XXXX" */
  trackingCode: string;
  cohortId: string;
  organizationId: string;
  category: AnonCategory;
  severity: AnonSeverity;
  status: AnonStatus;
  satgasEscalated: boolean;
  acknowledgedAt: Date | null;
  recordedAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}

export interface AnonReportDetail {
  id: string;
  trackingCode: string;
  cohortId: string;
  organizationId: string;
  category: AnonCategory;
  severity: AnonSeverity;
  status: AnonStatus;
  bodyText: string;
  bodyRedacted: boolean;
  reporterSeverity: AnonSeverity | null;
  severityReason: string[];
  satgasEscalated: boolean;
  satgasEscalatedAt: Date | null;
  satgasNotes: string | null;
  acknowledgedById: string | null;
  acknowledgedAt: Date | null;
  closedAt: Date | null;
  resolutionNotes: string | null;
  publicNote: string | null;
  attachmentKey: string | null;
  blmCategoryOverride: AnonCategory | null;
  blmSeverityOverride: AnonSeverity | null;
  recordedAt: Date;
  updatedAt: Date;
}
