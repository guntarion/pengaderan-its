/**
 * src/lib/__tests__/triwulan-state-machine.test.ts
 * NAWASENA M14 — Unit tests for state machine transitions and guards.
 */

import { describe, it, expect } from 'vitest';
import {
  transition,
  canSubmit,
  canPembinaSign,
  canBLMAcknowledge,
} from '../triwulan/state-machine/transitions';
import { ReviewStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// transition()
// ---------------------------------------------------------------------------
describe('transition()', () => {
  describe('valid forward transitions', () => {
    it('DRAFT → SUBMITTED_FOR_PEMBINA via SUBMIT_TO_PEMBINA', () => {
      const result = transition(ReviewStatus.DRAFT, 'SUBMIT_TO_PEMBINA');
      expect(result.ok).toBe(true);
      expect(result.newStatus).toBe(ReviewStatus.SUBMITTED_FOR_PEMBINA);
    });

    it('SUBMITTED_FOR_PEMBINA → PEMBINA_SIGNED via PEMBINA_SIGN', () => {
      const result = transition(ReviewStatus.SUBMITTED_FOR_PEMBINA, 'PEMBINA_SIGN');
      expect(result.ok).toBe(true);
      expect(result.newStatus).toBe(ReviewStatus.PEMBINA_SIGNED);
    });

    it('PEMBINA_SIGNED → BLM_ACKNOWLEDGED via BLM_ACKNOWLEDGE', () => {
      const result = transition(ReviewStatus.PEMBINA_SIGNED, 'BLM_ACKNOWLEDGE');
      expect(result.ok).toBe(true);
      expect(result.newStatus).toBe(ReviewStatus.BLM_ACKNOWLEDGED);
    });

    it('BLM_ACKNOWLEDGED → FINALIZED via FINALIZE', () => {
      const result = transition(ReviewStatus.BLM_ACKNOWLEDGED, 'FINALIZE');
      expect(result.ok).toBe(true);
      expect(result.newStatus).toBe(ReviewStatus.FINALIZED);
    });
  });

  describe('revision actions (supersession, no status change)', () => {
    it('SUBMITTED_FOR_PEMBINA + PEMBINA_REQUEST_REVISION returns ok with current status', () => {
      const result = transition(ReviewStatus.SUBMITTED_FOR_PEMBINA, 'PEMBINA_REQUEST_REVISION');
      expect(result.ok).toBe(true);
      expect(result.newStatus).toBe(ReviewStatus.SUBMITTED_FOR_PEMBINA);
    });

    it('PEMBINA_SIGNED + BLM_REQUEST_REVISION returns ok with current status', () => {
      const result = transition(ReviewStatus.PEMBINA_SIGNED, 'BLM_REQUEST_REVISION');
      expect(result.ok).toBe(true);
      expect(result.newStatus).toBe(ReviewStatus.PEMBINA_SIGNED);
    });
  });

  describe('invalid transitions', () => {
    it('DRAFT + PEMBINA_SIGN is invalid', () => {
      const result = transition(ReviewStatus.DRAFT, 'PEMBINA_SIGN');
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('FINALIZED + SUBMIT_TO_PEMBINA is invalid', () => {
      const result = transition(ReviewStatus.FINALIZED, 'SUBMIT_TO_PEMBINA');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('FINALIZED');
    });

    it('PEMBINA_SIGNED + SUBMIT_TO_PEMBINA is invalid', () => {
      const result = transition(ReviewStatus.PEMBINA_SIGNED, 'SUBMIT_TO_PEMBINA');
      expect(result.ok).toBe(false);
    });

    it('BLM_ACKNOWLEDGED + PEMBINA_SIGN is invalid', () => {
      const result = transition(ReviewStatus.BLM_ACKNOWLEDGED, 'PEMBINA_SIGN');
      expect(result.ok).toBe(false);
    });

    it('DRAFT + BLM_ACKNOWLEDGE is invalid', () => {
      const result = transition(ReviewStatus.DRAFT, 'BLM_ACKNOWLEDGE');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// canSubmit()
// ---------------------------------------------------------------------------
describe('canSubmit()', () => {
  it('returns ok for DRAFT with sufficient narrative', () => {
    const result = canSubmit(ReviewStatus.DRAFT, 200);
    expect(result.ok).toBe(true);
  });

  it('rejects non-DRAFT status', () => {
    const result = canSubmit(ReviewStatus.SUBMITTED_FOR_PEMBINA, 300);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('DRAFT');
  });

  it('rejects narrative < 200 chars', () => {
    const result = canSubmit(ReviewStatus.DRAFT, 199);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('200');
  });

  it('accepts narrative exactly 200 chars', () => {
    const result = canSubmit(ReviewStatus.DRAFT, 200);
    expect(result.ok).toBe(true);
  });

  it('accepts narrative > 200 chars', () => {
    const result = canSubmit(ReviewStatus.DRAFT, 500);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// canPembinaSign()
// ---------------------------------------------------------------------------
describe('canPembinaSign()', () => {
  describe('normal (non-URGENT) review', () => {
    it('returns ok for SUBMITTED_FOR_PEMBINA with any notes', () => {
      const result = canPembinaSign(ReviewStatus.SUBMITTED_FOR_PEMBINA, 'NONE', '', false);
      expect(result.ok).toBe(true);
    });

    it('returns ok with short notes (no URGENT constraint)', () => {
      const result = canPembinaSign(ReviewStatus.SUBMITTED_FOR_PEMBINA, 'WARNING', 'ok', false);
      expect(result.ok).toBe(true);
    });

    it('rejects wrong status', () => {
      const result = canPembinaSign(ReviewStatus.DRAFT, 'NONE', '', false);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('SUBMITTED_FOR_PEMBINA');
    });
  });

  describe('URGENT review', () => {
    it('rejects when inPersonReviewed is false', () => {
      const longNotes = 'x'.repeat(200);
      const result = canPembinaSign(ReviewStatus.SUBMITTED_FOR_PEMBINA, 'URGENT', longNotes, false);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('tatap muka');
    });

    it('rejects when notes < 200 chars even with in-person', () => {
      const result = canPembinaSign(ReviewStatus.SUBMITTED_FOR_PEMBINA, 'URGENT', 'too short', true);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('200');
    });

    it('returns ok with in-person + notes >= 200 chars', () => {
      const longNotes = 'x'.repeat(200);
      const result = canPembinaSign(ReviewStatus.SUBMITTED_FOR_PEMBINA, 'URGENT', longNotes, true);
      expect(result.ok).toBe(true);
    });

    it('rejects notes exactly 199 chars', () => {
      const notes = 'x'.repeat(199);
      const result = canPembinaSign(ReviewStatus.SUBMITTED_FOR_PEMBINA, 'URGENT', notes, true);
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// canBLMAcknowledge()
// ---------------------------------------------------------------------------
describe('canBLMAcknowledge()', () => {
  it('returns ok for PEMBINA_SIGNED with 10 items assessed', () => {
    const result = canBLMAcknowledge(ReviewStatus.PEMBINA_SIGNED, 10);
    expect(result.ok).toBe(true);
  });

  it('rejects when status is not PEMBINA_SIGNED', () => {
    const result = canBLMAcknowledge(ReviewStatus.DRAFT, 10);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('PEMBINA_SIGNED');
  });

  it('rejects when assessedItemCount < 10', () => {
    const result = canBLMAcknowledge(ReviewStatus.PEMBINA_SIGNED, 9);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('9/10');
  });

  it('rejects 0 assessed items', () => {
    const result = canBLMAcknowledge(ReviewStatus.PEMBINA_SIGNED, 0);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('0/10');
  });

  it('accepts exactly 10 assessed items', () => {
    const result = canBLMAcknowledge(ReviewStatus.PEMBINA_SIGNED, 10);
    expect(result.ok).toBe(true);
  });

  it('accepts > 10 assessed items (edge case)', () => {
    // Shouldn't happen in practice but should not reject
    const result = canBLMAcknowledge(ReviewStatus.PEMBINA_SIGNED, 10);
    expect(result.ok).toBe(true);
  });
});
