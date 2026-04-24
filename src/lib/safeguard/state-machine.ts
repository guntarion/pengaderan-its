/**
 * src/lib/safeguard/state-machine.ts
 * NAWASENA M10 — Incident state machine.
 *
 * Pure function: no DB calls, fully unit-testable.
 *
 * Valid transitions:
 *   OPEN → IN_REVIEW (claim — SC, Safeguard Officer)
 *   IN_REVIEW → RESOLVED (resolve — SC, Safeguard Officer who claimed; resolutionNote ≥ 30)
 *   RESOLVED → IN_REVIEW (reopen — SC only; reason required)
 *   IN_REVIEW → ESCALATED_TO_SATGAS (escalate — Safeguard Officer only; escalationReason ≥ 50)
 *   OPEN → RETRACTED_BY_REPORTER (retract — reporter within 30 min)
 *   IN_REVIEW → RETRACTED_BY_REPORTER (retract — reporter within 30 min)
 *   OPEN → RETRACTED_BY_SC (retract — SC)
 *   IN_REVIEW → RETRACTED_BY_SC (retract — SC)
 *   PENDING_REVIEW → OPEN (elaborate — SC, Safeguard Officer)
 *   PENDING_REVIEW → SUPERSEDED (supersede — SC or system via M09 signal)
 */

import { IncidentStatus, UserRole } from '@prisma/client';
import { IncidentActor, TransitionPayload, ValidationResult } from './types';

// ---- Retraction window ----

export const RETRACTION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// ---- Incident shape needed for validation ----

export interface IncidentForTransition {
  status: IncidentStatus;
  reportedById: string;
  claimedById: string | null;
  createdAt: Date;
}

// ---- Allowed roles per transition ----

type TransitionDef = {
  from: IncidentStatus[];
  to: IncidentStatus;
  allowedCondition: (
    incident: IncidentForTransition,
    actor: IncidentActor,
    payload: TransitionPayload,
  ) => string | null; // null = allowed; string = error reason
};

function isSCOrSafeguardOfficer(actor: IncidentActor): boolean {
  return actor.role === UserRole.SC || actor.isSafeguardOfficer;
}

const TRANSITIONS: TransitionDef[] = [
  // OPEN → IN_REVIEW (claim)
  {
    from: [IncidentStatus.OPEN],
    to: IncidentStatus.IN_REVIEW,
    allowedCondition: (incident, actor, payload) => {
      if (payload.type !== 'CLAIM') return 'Payload type must be CLAIM';
      if (!isSCOrSafeguardOfficer(actor)) return 'Only SC or Safeguard Officer can claim incidents';
      return null;
    },
  },
  // IN_REVIEW → RESOLVED (resolve)
  {
    from: [IncidentStatus.IN_REVIEW],
    to: IncidentStatus.RESOLVED,
    allowedCondition: (incident, actor, payload) => {
      if (payload.type !== 'RESOLVE') return 'Payload type must be RESOLVE';
      if (!isSCOrSafeguardOfficer(actor)) return 'Only SC or Safeguard Officer can resolve incidents';
      if (!payload.resolutionNote || payload.resolutionNote.trim().length < 30) {
        return 'resolutionNote must be at least 30 characters';
      }
      return null;
    },
  },
  // RESOLVED → IN_REVIEW (reopen)
  {
    from: [IncidentStatus.RESOLVED],
    to: IncidentStatus.IN_REVIEW,
    allowedCondition: (incident, actor, payload) => {
      if (payload.type !== 'REOPEN') return 'Payload type must be REOPEN';
      if (actor.role !== UserRole.SC) return 'Only SC can reopen incidents';
      if (!payload.reason || payload.reason.trim().length < 10) {
        return 'reason must be at least 10 characters';
      }
      return null;
    },
  },
  // IN_REVIEW → ESCALATED_TO_SATGAS (escalate)
  {
    from: [IncidentStatus.IN_REVIEW],
    to: IncidentStatus.ESCALATED_TO_SATGAS,
    allowedCondition: (incident, actor, payload) => {
      if (payload.type !== 'ESCALATE') return 'Payload type must be ESCALATE';
      if (!actor.isSafeguardOfficer) return 'Only Safeguard Officers can escalate to Satgas';
      if (!payload.escalationReason || payload.escalationReason.trim().length < 50) {
        return 'escalationReason must be at least 50 characters';
      }
      return null;
    },
  },
  // OPEN → RETRACTED_BY_REPORTER (reporter within 30 min)
  {
    from: [IncidentStatus.OPEN, IncidentStatus.IN_REVIEW],
    to: IncidentStatus.RETRACTED_BY_REPORTER,
    allowedCondition: (incident, actor, payload) => {
      if (payload.type !== 'RETRACT') return 'Payload type must be RETRACT';
      if (actor.id !== incident.reportedById) {
        // SC can retract as SC, not as reporter
        return 'Only the reporter can retract as reporter';
      }
      const ageMs = Date.now() - incident.createdAt.getTime();
      if (ageMs > RETRACTION_WINDOW_MS) {
        return `Retraction window expired (${RETRACTION_WINDOW_MS / 60000} minutes)`;
      }
      if (!payload.reason || payload.reason.trim().length < 5) {
        return 'reason must be at least 5 characters';
      }
      return null;
    },
  },
  // OPEN/IN_REVIEW → RETRACTED_BY_SC (SC only)
  {
    from: [IncidentStatus.OPEN, IncidentStatus.IN_REVIEW],
    to: IncidentStatus.RETRACTED_BY_SC,
    allowedCondition: (incident, actor, payload) => {
      if (payload.type !== 'RETRACT') return 'Payload type must be RETRACT';
      if (actor.role !== UserRole.SC) return 'Only SC can retract incident as SC';
      if (!payload.reason || payload.reason.trim().length < 10) {
        return 'reason must be at least 10 characters';
      }
      return null;
    },
  },
  // PENDING_REVIEW → OPEN (M09 cascade draft elaboration)
  {
    from: [IncidentStatus.PENDING_REVIEW],
    to: IncidentStatus.OPEN,
    allowedCondition: (incident, actor, payload) => {
      if (payload.type !== 'REOPEN') return 'Payload type must be REOPEN for elaboration';
      if (!isSCOrSafeguardOfficer(actor)) return 'Only SC or Safeguard Officer can elaborate draft incidents';
      return null;
    },
  },
  // PENDING_REVIEW → SUPERSEDED (M09 signals red flag removed)
  {
    from: [IncidentStatus.PENDING_REVIEW, IncidentStatus.OPEN],
    to: IncidentStatus.SUPERSEDED,
    allowedCondition: (incident, actor, payload) => {
      if (payload.type !== 'REOPEN') return 'Payload type must be REOPEN for supersede';
      // Allow SC or system (represented as SC role in service calls)
      if (!isSCOrSafeguardOfficer(actor)) return 'Only SC or Safeguard Officer can supersede incidents';
      return null;
    },
  },
];

/**
 * Validates whether a transition from incident.status → targetStatus is allowed.
 *
 * @returns ValidationResult { valid, errors }
 */
export function validateTransition(
  incident: IncidentForTransition,
  targetStatus: IncidentStatus,
  actor: IncidentActor,
  payload: TransitionPayload,
): ValidationResult {
  const matchingDefs = TRANSITIONS.filter(
    (t) => t.from.includes(incident.status) && t.to === targetStatus,
  );

  if (matchingDefs.length === 0) {
    return {
      valid: false,
      errors: [
        `Transition from ${incident.status} to ${targetStatus} is not allowed`,
      ],
    };
  }

  // Use first matching def (each from+to combination is unique in our TRANSITIONS)
  const def = matchingDefs[0];
  const error = def.allowedCondition(incident, actor, payload);

  if (error !== null) {
    return { valid: false, errors: [error] };
  }

  return { valid: true, errors: [] };
}

/**
 * Returns all valid target statuses from a given status (for UI hints).
 */
export function getValidTransitions(
  status: IncidentStatus,
): IncidentStatus[] {
  return TRANSITIONS
    .filter((t) => t.from.includes(status))
    .map((t) => t.to)
    .filter((v, i, arr) => arr.indexOf(v) === i); // dedupe
}
