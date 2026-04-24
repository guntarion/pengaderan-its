/**
 * src/lib/safeguard/types.ts
 * NAWASENA M10 — Shared TypeScript types for Safeguard & Insiden module.
 */

import {
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  ConsequenceType,
  ConsequenceStatus,
  TimelineAction,
  EscalationTarget,
  UserRole,
} from '@prisma/client';

// ---- Actor type used in state machine + service ----

export interface IncidentActor {
  id: string;
  role: UserRole;
  isSafeguardOfficer: boolean;
  organizationId: string;
}

// ---- Transition payload per transition type ----

export type TransitionPayload =
  | ClaimPayload
  | ResolvePayload
  | ReopenPayload
  | RetractPayload
  | EscalatePayload
  | NotePayload;

export interface ClaimPayload {
  type: 'CLAIM';
}

export interface ResolvePayload {
  type: 'RESOLVE';
  resolutionNote: string;
}

export interface ReopenPayload {
  type: 'REOPEN';
  reason: string;
}

export interface RetractPayload {
  type: 'RETRACT';
  reason: string;
}

export interface EscalatePayload {
  type: 'ESCALATE';
  escalationReason: string;
  escalatedTo: EscalationTarget;
  satgasTicketRef?: string;
}

export interface NotePayload {
  type: 'NOTE';
  noteText: string;
}

// ---- Validation result ----

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ---- Serialized incident for API responses ----

export interface SerializedIncident {
  id: string;
  organizationId: string;
  cohortId: string;
  kpGroupId: string | null;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  actionTaken: string | null;
  affectedUserId: string | null;
  additionalAffectedUserIds: string[];
  reportedById: string;
  claimedById: string | null;
  claimedAt: string | null;
  resolvedById: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  escalatedTo: EscalationTarget | null;
  escalatedById: string | null;
  escalatedAt: string | null;
  escalationReason: string | null;
  satgasTicketRef: string | null;
  satgasPdfKey: string | null;
  attachmentKeys: string[];
  retractedAt: string | null;
  retractedById: string | null;
  retractionReason: string | null;
  // Relations (optional, populated if included)
  reportedByName?: string;
  affectedUserName?: string;
  claimedByName?: string;
  // Derived fields
  canRetract?: boolean;
}

// ---- Escalation cascade result ----

export interface CascadeResult {
  incidentId: string;
  status: 'PENDING_REVIEW' | 'EXISTING_RETURNED';
}

// ---- Timeline entry creation params ----

export interface TimelineEntryParams {
  organizationId: string;
  incidentId: string;
  actorId: string;
  action: TimelineAction;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  fieldName?: string;
  noteText?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ---- Consequence assign params ----

export interface ConsequenceAssignParams {
  organizationId: string;
  cohortId: string;
  targetUserId: string;
  type: ConsequenceType;
  reasonText: string;
  relatedIncidentId?: string;
  deadline?: Date;
  pointsDeducted?: number;
  forbiddenActCode?: string;
}

// ---- ConsequenceLog status filter ----

export type ConsequenceStatusFilter = ConsequenceStatus | 'ALL';
