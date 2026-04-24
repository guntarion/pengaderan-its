/**
 * src/lib/safeguard/__tests__/state-machine.test.ts
 * NAWASENA M10 — State machine unit tests (100% coverage of all transitions).
 */

import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  getValidTransitions,
  RETRACTION_WINDOW_MS,
  type IncidentForTransition,
} from '../state-machine';
import { IncidentStatus, UserRole } from '@prisma/client';
import type { IncidentActor, TransitionPayload } from '../types';

// ---- Helpers ----

function makeIncident(
  overrides: Partial<IncidentForTransition> = {},
): IncidentForTransition {
  return {
    status: IncidentStatus.OPEN,
    reportedById: 'reporter-1',
    claimedById: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeSC(): IncidentActor {
  return {
    id: 'sc-1',
    role: UserRole.SC,
    isSafeguardOfficer: false,
    organizationId: 'org-1',
  };
}

function makeSafeguardOfficer(): IncidentActor {
  return {
    id: 'so-1',
    role: UserRole.OC,
    isSafeguardOfficer: true,
    organizationId: 'org-1',
  };
}

function makeKP(id = 'kp-1'): IncidentActor {
  return {
    id,
    role: UserRole.KP,
    isSafeguardOfficer: false,
    organizationId: 'org-1',
  };
}

function makeMaba(): IncidentActor {
  return {
    id: 'maba-1',
    role: UserRole.MABA,
    isSafeguardOfficer: false,
    organizationId: 'org-1',
  };
}

// ---- Tests ----

describe('validateTransition — OPEN → IN_REVIEW (claim)', () => {
  it('SC can claim OPEN incident', () => {
    const incident = makeIncident({ status: IncidentStatus.OPEN });
    const result = validateTransition(incident, IncidentStatus.IN_REVIEW, makeSC(), { type: 'CLAIM' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('Safeguard Officer can claim OPEN incident', () => {
    const incident = makeIncident({ status: IncidentStatus.OPEN });
    const result = validateTransition(incident, IncidentStatus.IN_REVIEW, makeSafeguardOfficer(), { type: 'CLAIM' });
    expect(result.valid).toBe(true);
  });

  it('KP cannot claim incident', () => {
    const incident = makeIncident({ status: IncidentStatus.OPEN });
    const result = validateTransition(incident, IncidentStatus.IN_REVIEW, makeKP(), { type: 'CLAIM' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('SC or Safeguard Officer');
  });

  it('Maba cannot claim incident', () => {
    const incident = makeIncident({ status: IncidentStatus.OPEN });
    const result = validateTransition(incident, IncidentStatus.IN_REVIEW, makeMaba(), { type: 'CLAIM' });
    expect(result.valid).toBe(false);
  });

  it('Cannot claim from IN_REVIEW (duplicate claim)', () => {
    const incident = makeIncident({ status: IncidentStatus.IN_REVIEW });
    const result = validateTransition(incident, IncidentStatus.IN_REVIEW, makeSC(), { type: 'CLAIM' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not allowed');
  });

  it('Cannot claim RESOLVED incident', () => {
    const incident = makeIncident({ status: IncidentStatus.RESOLVED });
    const result = validateTransition(incident, IncidentStatus.IN_REVIEW, makeSC(), { type: 'CLAIM' });
    // RESOLVED → IN_REVIEW exists but requires REOPEN payload
    const result2 = validateTransition(incident, IncidentStatus.IN_REVIEW, makeSC(), { type: 'REOPEN', reason: 'Re-examining the evidence found' });
    expect(result.valid).toBe(false);
    expect(result2.valid).toBe(true); // reopen works
  });
});

describe('validateTransition — IN_REVIEW → RESOLVED (resolve)', () => {
  it('SC can resolve IN_REVIEW incident with sufficient note', () => {
    const incident = makeIncident({ status: IncidentStatus.IN_REVIEW });
    const result = validateTransition(incident, IncidentStatus.RESOLVED, makeSC(), {
      type: 'RESOLVE',
      resolutionNote: 'Issue resolved after detailed investigation and counseling session with all parties involved.',
    });
    expect(result.valid).toBe(true);
  });

  it('Safeguard Officer can resolve', () => {
    const incident = makeIncident({ status: IncidentStatus.IN_REVIEW });
    const result = validateTransition(incident, IncidentStatus.RESOLVED, makeSafeguardOfficer(), {
      type: 'RESOLVE',
      resolutionNote: 'All parties have agreed to resolution terms and counseling is complete.',
    });
    expect(result.valid).toBe(true);
  });

  it('Reject if resolutionNote too short (< 30 chars)', () => {
    const incident = makeIncident({ status: IncidentStatus.IN_REVIEW });
    const result = validateTransition(incident, IncidentStatus.RESOLVED, makeSC(), {
      type: 'RESOLVE',
      resolutionNote: 'Too short',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('30 characters');
  });

  it('Reject if resolutionNote empty string', () => {
    const incident = makeIncident({ status: IncidentStatus.IN_REVIEW });
    const result = validateTransition(incident, IncidentStatus.RESOLVED, makeSC(), {
      type: 'RESOLVE',
      resolutionNote: '',
    });
    expect(result.valid).toBe(false);
  });

  it('KP cannot resolve incident', () => {
    const incident = makeIncident({ status: IncidentStatus.IN_REVIEW });
    const result = validateTransition(incident, IncidentStatus.RESOLVED, makeKP(), {
      type: 'RESOLVE',
      resolutionNote: 'Issue fully resolved after thorough investigation of all reported facts.',
    });
    expect(result.valid).toBe(false);
  });

  it('Cannot resolve from OPEN (direct OPEN → RESOLVED is invalid)', () => {
    const incident = makeIncident({ status: IncidentStatus.OPEN });
    const result = validateTransition(incident, IncidentStatus.RESOLVED, makeSC(), {
      type: 'RESOLVE',
      resolutionNote: 'Issue fully resolved after thorough investigation of all reported facts.',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not allowed');
  });
});

describe('validateTransition — RESOLVED → IN_REVIEW (reopen)', () => {
  it('SC can reopen RESOLVED incident', () => {
    const incident = makeIncident({ status: IncidentStatus.RESOLVED });
    const result = validateTransition(incident, IncidentStatus.IN_REVIEW, makeSC(), {
      type: 'REOPEN',
      reason: 'New evidence has been found that requires further investigation.',
    });
    expect(result.valid).toBe(true);
  });

  it('Safeguard Officer cannot reopen (SC only)', () => {
    const incident = makeIncident({ status: IncidentStatus.RESOLVED });
    const result = validateTransition(incident, IncidentStatus.IN_REVIEW, makeSafeguardOfficer(), {
      type: 'REOPEN',
      reason: 'New evidence found that requires further investigation.',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('SC');
  });

  it('Reject if reason too short (< 10 chars)', () => {
    const incident = makeIncident({ status: IncidentStatus.RESOLVED });
    const result = validateTransition(incident, IncidentStatus.IN_REVIEW, makeSC(), {
      type: 'REOPEN',
      reason: 'Short',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('10 characters');
  });

  it('Cannot reopen OPEN incident', () => {
    const incident = makeIncident({ status: IncidentStatus.OPEN });
    // OPEN → IN_REVIEW with REOPEN payload should fail (requires CLAIM payload)
    const result = validateTransition(incident, IncidentStatus.IN_REVIEW, makeSC(), {
      type: 'REOPEN',
      reason: 'New evidence found that requires further investigation.',
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateTransition — IN_REVIEW → ESCALATED_TO_SATGAS (escalate)', () => {
  it('Safeguard Officer can escalate IN_REVIEW incident', () => {
    const incident = makeIncident({ status: IncidentStatus.IN_REVIEW });
    const result = validateTransition(incident, IncidentStatus.ESCALATED_TO_SATGAS, makeSafeguardOfficer(), {
      type: 'ESCALATE',
      escalationReason: 'Physical violence confirmed requiring formal Satgas PPKPT intervention and documentation.',
      escalatedTo: 'SATGAS_PPKPT_ITS',
    });
    expect(result.valid).toBe(true);
  });

  it('SC cannot escalate (Safeguard Officer only)', () => {
    const incident = makeIncident({ status: IncidentStatus.IN_REVIEW });
    const result = validateTransition(incident, IncidentStatus.ESCALATED_TO_SATGAS, makeSC(), {
      type: 'ESCALATE',
      escalationReason: 'Physical violence confirmed requiring formal Satgas PPKPT intervention and documentation.',
      escalatedTo: 'SATGAS_PPKPT_ITS',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Safeguard Officer');
  });

  it('KP cannot escalate', () => {
    const incident = makeIncident({ status: IncidentStatus.IN_REVIEW });
    const result = validateTransition(incident, IncidentStatus.ESCALATED_TO_SATGAS, makeKP(), {
      type: 'ESCALATE',
      escalationReason: 'Physical violence confirmed requiring formal Satgas PPKPT intervention and documentation.',
      escalatedTo: 'SATGAS_PPKPT_ITS',
    });
    expect(result.valid).toBe(false);
  });

  it('Reject if escalationReason < 50 chars', () => {
    const incident = makeIncident({ status: IncidentStatus.IN_REVIEW });
    const result = validateTransition(incident, IncidentStatus.ESCALATED_TO_SATGAS, makeSafeguardOfficer(), {
      type: 'ESCALATE',
      escalationReason: 'Too short',
      escalatedTo: 'SATGAS_PPKPT_ITS',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('50 characters');
  });

  it('Cannot escalate from OPEN (must claim first)', () => {
    const incident = makeIncident({ status: IncidentStatus.OPEN });
    const result = validateTransition(incident, IncidentStatus.ESCALATED_TO_SATGAS, makeSafeguardOfficer(), {
      type: 'ESCALATE',
      escalationReason: 'Physical violence confirmed requiring formal Satgas PPKPT intervention and documentation.',
      escalatedTo: 'SATGAS_PPKPT_ITS',
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateTransition — OPEN/IN_REVIEW → RETRACTED_BY_REPORTER', () => {
  it('Reporter can retract OPEN incident within window', () => {
    const incident = makeIncident({
      status: IncidentStatus.OPEN,
      reportedById: 'kp-1',
      createdAt: new Date(),
    });
    const result = validateTransition(incident, IncidentStatus.RETRACTED_BY_REPORTER, makeKP('kp-1'), {
      type: 'RETRACT',
      reason: 'Mistake in report',
    });
    expect(result.valid).toBe(true);
  });

  it('Reporter can retract IN_REVIEW incident within window', () => {
    const incident = makeIncident({
      status: IncidentStatus.IN_REVIEW,
      reportedById: 'kp-1',
      createdAt: new Date(),
    });
    const result = validateTransition(incident, IncidentStatus.RETRACTED_BY_REPORTER, makeKP('kp-1'), {
      type: 'RETRACT',
      reason: 'Mistake in report',
    });
    expect(result.valid).toBe(true);
  });

  it('Reporter cannot retract after 30-minute window', () => {
    const incident = makeIncident({
      status: IncidentStatus.OPEN,
      reportedById: 'kp-1',
      createdAt: new Date(Date.now() - RETRACTION_WINDOW_MS - 1000),
    });
    const result = validateTransition(incident, IncidentStatus.RETRACTED_BY_REPORTER, makeKP('kp-1'), {
      type: 'RETRACT',
      reason: 'Mistake in report',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('window expired');
  });

  it('Non-reporter cannot retract as reporter', () => {
    const incident = makeIncident({
      status: IncidentStatus.OPEN,
      reportedById: 'reporter-1',
      createdAt: new Date(),
    });
    const result = validateTransition(incident, IncidentStatus.RETRACTED_BY_REPORTER, makeKP('other-kp'), {
      type: 'RETRACT',
      reason: 'Mistake in report',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('reporter');
  });
});

describe('validateTransition — OPEN/IN_REVIEW → RETRACTED_BY_SC', () => {
  it('SC can retract OPEN incident', () => {
    const incident = makeIncident({ status: IncidentStatus.OPEN });
    const result = validateTransition(incident, IncidentStatus.RETRACTED_BY_SC, makeSC(), {
      type: 'RETRACT',
      reason: 'Report determined to be invalid after SC investigation.',
    });
    expect(result.valid).toBe(true);
  });

  it('SC can retract IN_REVIEW incident', () => {
    const incident = makeIncident({ status: IncidentStatus.IN_REVIEW });
    const result = validateTransition(incident, IncidentStatus.RETRACTED_BY_SC, makeSC(), {
      type: 'RETRACT',
      reason: 'Report determined to be invalid after SC investigation.',
    });
    expect(result.valid).toBe(true);
  });

  it('KP cannot retract as SC', () => {
    const incident = makeIncident({ status: IncidentStatus.OPEN });
    const result = validateTransition(incident, IncidentStatus.RETRACTED_BY_SC, makeKP(), {
      type: 'RETRACT',
      reason: 'Report determined to be invalid after SC investigation.',
    });
    expect(result.valid).toBe(false);
  });

  it('Safeguard Officer without SC role cannot retract as SC', () => {
    const incident = makeIncident({ status: IncidentStatus.OPEN });
    const result = validateTransition(incident, IncidentStatus.RETRACTED_BY_SC, makeSafeguardOfficer(), {
      type: 'RETRACT',
      reason: 'Report determined to be invalid after SC investigation.',
    });
    expect(result.valid).toBe(false);
  });

  it('Reject if SC reason too short (< 10 chars)', () => {
    const incident = makeIncident({ status: IncidentStatus.OPEN });
    const result = validateTransition(incident, IncidentStatus.RETRACTED_BY_SC, makeSC(), {
      type: 'RETRACT',
      reason: 'Short',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('10 characters');
  });
});

describe('validateTransition — PENDING_REVIEW → OPEN (elaborate)', () => {
  it('SC can elaborate draft incident', () => {
    const incident = makeIncident({ status: IncidentStatus.PENDING_REVIEW });
    const result = validateTransition(incident, IncidentStatus.OPEN, makeSC(), {
      type: 'REOPEN',
      reason: 'Elaborated incident from M09 cascade',
    });
    expect(result.valid).toBe(true);
  });

  it('KP cannot elaborate draft incident', () => {
    const incident = makeIncident({ status: IncidentStatus.PENDING_REVIEW });
    const result = validateTransition(incident, IncidentStatus.OPEN, makeKP(), {
      type: 'REOPEN',
      reason: 'Elaborated incident from M09 cascade',
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateTransition — PENDING_REVIEW/OPEN → SUPERSEDED', () => {
  it('SC can supersede PENDING_REVIEW incident', () => {
    const incident = makeIncident({ status: IncidentStatus.PENDING_REVIEW });
    const result = validateTransition(incident, IncidentStatus.SUPERSEDED, makeSC(), {
      type: 'REOPEN',
      reason: 'M09 red flag removed',
    });
    expect(result.valid).toBe(true);
  });

  it('SC can supersede OPEN incident', () => {
    const incident = makeIncident({ status: IncidentStatus.OPEN });
    const result = validateTransition(incident, IncidentStatus.SUPERSEDED, makeSC(), {
      type: 'REOPEN',
      reason: 'M09 red flag removed',
    });
    expect(result.valid).toBe(true);
  });

  it('KP cannot supersede incident', () => {
    const incident = makeIncident({ status: IncidentStatus.PENDING_REVIEW });
    const result = validateTransition(incident, IncidentStatus.SUPERSEDED, makeKP(), {
      type: 'REOPEN',
      reason: 'M09 red flag removed',
    });
    expect(result.valid).toBe(false);
  });
});

describe('getValidTransitions', () => {
  it('OPEN has CLAIM and RETRACT transitions', () => {
    const transitions = getValidTransitions(IncidentStatus.OPEN);
    expect(transitions).toContain(IncidentStatus.IN_REVIEW);
    expect(transitions).toContain(IncidentStatus.RETRACTED_BY_REPORTER);
    expect(transitions).toContain(IncidentStatus.RETRACTED_BY_SC);
    expect(transitions).toContain(IncidentStatus.SUPERSEDED);
  });

  it('IN_REVIEW has RESOLVE, ESCALATE, RETRACT', () => {
    const transitions = getValidTransitions(IncidentStatus.IN_REVIEW);
    expect(transitions).toContain(IncidentStatus.RESOLVED);
    expect(transitions).toContain(IncidentStatus.ESCALATED_TO_SATGAS);
    expect(transitions).toContain(IncidentStatus.RETRACTED_BY_REPORTER);
    expect(transitions).toContain(IncidentStatus.RETRACTED_BY_SC);
  });

  it('RESOLVED has REOPEN only', () => {
    const transitions = getValidTransitions(IncidentStatus.RESOLVED);
    expect(transitions).toContain(IncidentStatus.IN_REVIEW);
    expect(transitions).not.toContain(IncidentStatus.OPEN);
  });

  it('ESCALATED_TO_SATGAS has no transitions', () => {
    const transitions = getValidTransitions(IncidentStatus.ESCALATED_TO_SATGAS);
    expect(transitions).toHaveLength(0);
  });

  it('RETRACTED_BY_REPORTER has no transitions', () => {
    const transitions = getValidTransitions(IncidentStatus.RETRACTED_BY_REPORTER);
    expect(transitions).toHaveLength(0);
  });

  it('RETRACTED_BY_SC has no transitions', () => {
    const transitions = getValidTransitions(IncidentStatus.RETRACTED_BY_SC);
    expect(transitions).toHaveLength(0);
  });
});
