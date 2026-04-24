/**
 * src/lib/schemas/kp-group.ts
 * Zod schemas for KP Group + related M03 operations.
 */

import { z } from 'zod';

// ============================================================
// KP Group CRUD
// ============================================================

export const createKPGroupSchema = z.object({
  cohortId: z.string().min(1, 'Cohort wajib diisi'),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  kpCoordinatorUserId: z.string().min(1, 'Koordinator KP wajib dipilih'),
  assistantUserIds: z.array(z.string()).max(2).default([]),
  capacityTarget: z.number().int().min(10).max(15).default(12),
  capacityMax: z.number().int().min(12).max(18).default(15),
});

export const updateKPGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  kpCoordinatorUserId: z.string().optional(),
  assistantUserIds: z.array(z.string()).max(2).optional(),
  capacityTarget: z.number().int().min(10).max(15).optional(),
  capacityMax: z.number().int().min(12).max(18).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
});

export const archiveKPGroupSchema = z.object({
  reason: z.string().min(1, 'Alasan arsip wajib diisi').optional(),
});

// ============================================================
// KP Group Members
// ============================================================

export const addKPGroupMemberSchema = z.object({
  userId: z.string().min(1, 'User wajib dipilih'),
  memberType: z.enum(['MABA', 'ASSISTANT']).default('MABA'),
});

export const removeKPGroupMemberSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(1, 'Alasan keluar wajib diisi'),
});

// ============================================================
// Bulk Assign
// ============================================================

export const bulkAssignPreviewSchema = z.object({
  cohortId: z.string().min(1),
  mode: z.enum(['round-robin', 'random-seeded', 'stratified']),
  seed: z.string().optional(),
});

export const bulkAssignCommitSchema = z.object({
  previewToken: z.string().min(1, 'Preview token wajib ada'),
  cohortId: z.string().min(1),
});

// ============================================================
// Buddy Pair
// ============================================================

export const generateBuddyPreviewSchema = z.object({
  cohortId: z.string().min(1),
  seed: z.string().min(1).default(() => Date.now().toString(36)),
  oddStrategy: z.enum(['triple', 'unassigned']).default('triple'),
});

export const generateBuddyCommitSchema = z.object({
  previewToken: z.string().min(1),
  cohortId: z.string().min(1),
});

export const swapBuddyPairSchema = z.object({
  otherPairId: z.string().min(1, 'Pasangan buddy lain wajib dipilih'),
  swapUserIdA: z.string().min(1),
  swapUserIdB: z.string().min(1),
  reason: z.string().optional(),
});

// ============================================================
// Kasuh Pair
// ============================================================

export const kasuhSuggestPreviewSchema = z.object({
  cohortId: z.string().min(1),
});

export const kasuhSuggestCommitSchema = z.object({
  previewToken: z.string().min(1),
  cohortId: z.string().min(1),
  // SC picks: mabaUserId → kasuhUserId mapping
  picks: z.array(z.object({
    mabaUserId: z.string().min(1),
    kasuhUserId: z.string().min(1),
  })).min(1, 'Minimal 1 pasangan wajib dipilih'),
});

export const reassignKasuhSchema = z.object({
  newKasuhUserId: z.string().min(1, 'Kasuh baru wajib dipilih'),
  reason: z.string().min(1, 'Alasan penggantian wajib diisi'),
});

// ============================================================
// Pairing Request (Admin/SC side)
// ============================================================

export const approveRequestSchema = z.object({
  note: z.string().optional(),
});

export const rejectRequestSchema = z.object({
  resolutionNote: z.string().min(1, 'Alasan penolakan wajib diisi'),
});

export const fulfillRequestSchema = z.object({
  newKasuhUserId: z.string().min(1, 'Kasuh baru wajib dipilih'),
  note: z.string().optional(),
});

// ============================================================
// Pairing Request (MABA side)
// ============================================================

export const submitPairingRequestSchema = z.object({
  type: z.enum(['RE_PAIR_KASUH', 'KASUH_UNREACHABLE']),
  currentKasuhPairId: z.string().min(1, 'Pasangan Kasuh saat ini wajib ada'),
  optionalNote: z.string().max(1000).optional(),
  preferenceHint: z.object({
    avoidHobby: z.array(z.string()).optional(),
    preferProvince: z.string().nullable().optional(),
  }).optional(),
});

export type CreateKPGroupInput = z.infer<typeof createKPGroupSchema>;
export type UpdateKPGroupInput = z.infer<typeof updateKPGroupSchema>;
export type BulkAssignPreviewInput = z.infer<typeof bulkAssignPreviewSchema>;
export type BulkAssignCommitInput = z.infer<typeof bulkAssignCommitSchema>;
export type GenerateBuddyPreviewInput = z.infer<typeof generateBuddyPreviewSchema>;
export type KasuhSuggestCommitInput = z.infer<typeof kasuhSuggestCommitSchema>;
export type SubmitPairingRequestInput = z.infer<typeof submitPairingRequestSchema>;
