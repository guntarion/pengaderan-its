/**
 * src/lib/mh-screening/types.ts
 * NAWASENA M11 — Shared Zod schemas and TypeScript types for MH Screening.
 */

import { z } from 'zod';

// ============================================
// Zod Schemas
// ============================================

export const MHConsentSchema = z.object({
  cohortId: z.string().cuid(),
  consentVersion: z.string().regex(/^v\d+\.\d+$/),
  scope: z.object({
    screening: z.boolean(),
    research: z.boolean().default(false),
  }),
});

export type MHConsentInput = z.infer<typeof MHConsentSchema>;

export const PHQ9SubmissionSchema = z.object({
  cohortId: z.string().cuid(),
  phase: z.enum(['F1', 'F4', 'SELF_TRIGGERED']),
  answers: z.array(z.number().int().min(0).max(3)).length(9),
  consentId: z.string().cuid(),
});

export type PHQ9SubmissionInput = z.infer<typeof PHQ9SubmissionSchema>;

export const SACFollowUpNoteSchema = z.object({
  note: z.string().min(1).max(2000),
  statusTransition: z.enum(['IN_PROGRESS', 'RESOLVED']).optional(),
});

export type SACFollowUpNoteInput = z.infer<typeof SACFollowUpNoteSchema>;

export const MHStatusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED']),
  reason: z.string().max(500).optional(),
});

export type MHStatusUpdateInput = z.infer<typeof MHStatusUpdateSchema>;

export const MHReassignSchema = z.object({
  newCounselorId: z.string().cuid(),
  reason: z.string().min(1).max(500),
});

export type MHReassignInput = z.infer<typeof MHReassignSchema>;

export const MHM10ReferSchema = z.object({
  consentDocumented: z.literal(true, {
    errorMap: () => ({ message: 'Persetujuan atau dokumentasi duty-of-care harus dikonfirmasi' }),
  }),
  dutyOfCareReason: z.string().min(20).max(1000),
});

export type MHM10ReferInput = z.infer<typeof MHM10ReferSchema>;

export const MHDeleteRequestSchema = z.object({
  confirmText: z.literal('HAPUS DATA SAYA'),
});

export type MHDeleteRequestInput = z.infer<typeof MHDeleteRequestSchema>;

export const MHResearchConsentSchema = z.object({
  cohortId: z.string().cuid(),
  consentVersion: z.string().regex(/^v\d+\.\d+$/),
  scope: z.array(z.string()).min(1),
});

export type MHResearchConsentInput = z.infer<typeof MHResearchConsentSchema>;

// ============================================
// TypeScript Types
// ============================================

export type MHSeverity = 'GREEN' | 'YELLOW' | 'RED';
export type MHScreeningPhase = 'F1' | 'F4' | 'SELF_TRIGGERED';
export type MHReferralStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REASSIGNED' | 'TAKEN_OVER' | 'CANCELLED';

/** Screening metadata returned to client (no raw scores, no encrypted fields) */
export interface MHScreeningMeta {
  id: string;
  instrument: string;
  phase: MHScreeningPhase;
  severity: MHSeverity;
  flagged: boolean;
  immediateContact: boolean;
  recordedAt: Date;
}

/** Submission result returned after successful submit */
export interface MHSubmissionResult {
  screeningId: string;
  severity: MHSeverity;
  flagged: boolean;
  immediateContact: boolean;
  interpretationKey: string;
}

/** SAC referral list item */
export interface SACReferralListItem {
  id: string;
  screeningId: string;
  status: MHReferralStatus;
  slaDeadlineAt: Date;
  escalatedAt: Date | null;
  createdAt: Date;
  screening: {
    instrument: string;
    phase: MHScreeningPhase;
    severity: MHSeverity;
    immediateContact: boolean;
    recordedAt: Date;
  };
}
