/**
 * src/lib/triwulan/state-machine/transitions.ts
 * NAWASENA M14 — Triwulan Review State Machine.
 *
 * Pure function transitions. No side effects.
 * All state changes must go through this module.
 */

import { ReviewStatus } from '@prisma/client';

export type TransitionAction =
  | 'SUBMIT_TO_PEMBINA'
  | 'PEMBINA_SIGN'
  | 'PEMBINA_REQUEST_REVISION'
  | 'BLM_ACKNOWLEDGE'
  | 'BLM_REQUEST_REVISION'
  | 'FINALIZE';

export interface TransitionResult {
  ok: boolean;
  newStatus?: ReviewStatus;
  error?: string;
}

/**
 * Valid state transitions map.
 * Key: `${currentStatus}:${action}` → newStatus
 */
const TRANSITIONS: Record<string, ReviewStatus> = {
  [`${ReviewStatus.DRAFT}:SUBMIT_TO_PEMBINA`]: ReviewStatus.SUBMITTED_FOR_PEMBINA,
  [`${ReviewStatus.SUBMITTED_FOR_PEMBINA}:PEMBINA_SIGN`]: ReviewStatus.PEMBINA_SIGNED,
  [`${ReviewStatus.PEMBINA_SIGNED}:BLM_ACKNOWLEDGE`]: ReviewStatus.BLM_ACKNOWLEDGED,
  [`${ReviewStatus.BLM_ACKNOWLEDGED}:FINALIZE`]: ReviewStatus.FINALIZED,
};

/**
 * Actions that result in a supersession (new review created, old stays).
 * These don't change the current status — they trigger revision lineage.
 */
const REVISION_ACTIONS = new Set<string>([
  `${ReviewStatus.SUBMITTED_FOR_PEMBINA}:PEMBINA_REQUEST_REVISION`,
  `${ReviewStatus.PEMBINA_SIGNED}:BLM_REQUEST_REVISION`,
]);

/**
 * Compute the next state for a given current status + action.
 *
 * @param currentStatus - Current review status
 * @param action - The action being performed
 * @returns { ok, newStatus?, error? }
 */
export function transition(currentStatus: ReviewStatus, action: TransitionAction): TransitionResult {
  const key = `${currentStatus}:${action}`;

  // Check forward transition
  if (key in TRANSITIONS) {
    return { ok: true, newStatus: TRANSITIONS[key] };
  }

  // Revision actions don't change status — return ok with current status
  if (REVISION_ACTIONS.has(key)) {
    return { ok: true, newStatus: currentStatus };
  }

  // Invalid transition
  return {
    ok: false,
    error: `Transisi tidak valid: status=${currentStatus}, aksi=${action}`,
  };
}

/**
 * Check if a review can be submitted by SC.
 * @param status - Current status
 * @param narrativeLength - Length of executive summary
 */
export function canSubmit(status: ReviewStatus, narrativeLength: number): { ok: boolean; error?: string } {
  if (status !== ReviewStatus.DRAFT) {
    return { ok: false, error: 'Review harus berstatus DRAFT untuk disubmit.' };
  }
  if (narrativeLength < 200) {
    return { ok: false, error: `Ringkasan eksekutif harus minimal 200 karakter (saat ini: ${narrativeLength}).` };
  }
  return { ok: true };
}

/**
 * Check if review can be signed by Pembina.
 */
export function canPembinaSign(
  status: ReviewStatus,
  escalationLevel: string,
  notes: string,
  inPersonReviewed: boolean
): { ok: boolean; error?: string } {
  if (status !== ReviewStatus.SUBMITTED_FOR_PEMBINA) {
    return { ok: false, error: 'Review harus berstatus SUBMITTED_FOR_PEMBINA untuk ditandatangani.' };
  }
  if (escalationLevel === 'URGENT') {
    if (!inPersonReviewed) {
      return {
        ok: false,
        error: 'Review dengan eskalasi URGENT memerlukan review tatap muka. Centang konfirmasi tatap muka.',
      };
    }
    if (notes.length < 200) {
      return {
        ok: false,
        error: `Review URGENT memerlukan catatan Pembina minimal 200 karakter (saat ini: ${notes.length}).`,
      };
    }
  }
  return { ok: true };
}

/**
 * Check if BLM can acknowledge a review.
 * @param status - Current status
 * @param assessedItemCount - Number of items with coverage != NOT_ASSESSED
 */
export function canBLMAcknowledge(
  status: ReviewStatus,
  assessedItemCount: number
): { ok: boolean; error?: string } {
  if (status !== ReviewStatus.PEMBINA_SIGNED) {
    return { ok: false, error: 'Review harus berstatus PEMBINA_SIGNED untuk di-acknowledge oleh BLM.' };
  }
  if (assessedItemCount < 10) {
    return {
      ok: false,
      error: `Semua 10 muatan wajib harus dinilai sebelum acknowledge (saat ini: ${assessedItemCount}/10).`,
    };
  }
  return { ok: true };
}
