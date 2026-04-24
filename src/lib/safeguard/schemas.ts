/**
 * src/lib/safeguard/schemas.ts
 * NAWASENA M10 — Zod validation schemas for Safeguard & Insiden.
 *
 * ConsequenceType is strictly non-physical per Permen 55/2024.
 * Attempt to submit invalid type → 400 rejection.
 */

import { z } from 'zod';
import {
  IncidentType,
  IncidentSeverity,
  ConsequenceType,
  EscalationTarget,
} from '@prisma/client';

// ---- Shared ----

const cuidSchema = z.string().cuid();

// ---- Create Incident (F2 full form) ----

export const createIncidentSchema = z.object({
  type: z.nativeEnum(IncidentType),
  severity: z.nativeEnum(IncidentSeverity),
  occurredAt: z.string().datetime(),
  actionTaken: z.string().max(5000).optional(),
  affectedUserId: cuidSchema.optional(),
  additionalAffectedUserIds: z.array(cuidSchema).max(20).default([]),
  kpGroupId: cuidSchema.optional(),
  cohortId: cuidSchema,
  notes: z.record(z.unknown()).optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

// ---- Safe Word Quick (F1 — KP only) ----

export const safeWordQuickSchema = z.object({
  cohortId: cuidSchema,
  affectedUserIds: z.array(cuidSchema).max(20).optional().default([]),
  reasonShort: z.string().max(500).optional(),
  kpGroupId: cuidSchema.optional(),
});

export type SafeWordQuickInput = z.infer<typeof safeWordQuickSchema>;

// ---- Update Incident (partial PATCH — non-status fields) ----

export const updateIncidentSchema = z.object({
  actionTaken: z.string().max(5000).optional(),
  affectedUserId: cuidSchema.optional().nullable(),
  additionalAffectedUserIds: z.array(cuidSchema).max(20).optional(),
  kpGroupId: cuidSchema.optional().nullable(),
  notes: z.record(z.unknown()).optional(),
});

export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;

// ---- State transition schemas ----

export const claimSchema = z.object({});

export const resolveSchema = z.object({
  resolutionNote: z.string().min(30, 'resolutionNote must be at least 30 characters'),
});

export const reopenSchema = z.object({
  reason: z.string().min(10, 'reason must be at least 10 characters'),
});

export const retractSchema = z.object({
  reason: z.string().min(5, 'reason must be at least 5 characters'),
});

export const escalateSchema = z.object({
  escalationReason: z.string().min(50, 'escalationReason must be at least 50 characters'),
  escalatedTo: z.nativeEnum(EscalationTarget).default(EscalationTarget.SATGAS_PPKPT_ITS),
  satgasTicketRef: z.string().max(100).optional(),
});

export const addNoteSchema = z.object({
  noteText: z.string().min(10, 'noteText must be at least 10 characters').max(5000),
});

export const pembinaAnnotationSchema = z.object({
  noteText: z.string().min(10, 'noteText must be at least 10 characters').max(5000),
});

// ---- Consequence Assign ----

// Mirror of ConsequenceType enum for compile-time + runtime validation
const ALLOWED_CONSEQUENCE_TYPES = [
  ConsequenceType.REFLEKSI_500_KATA,
  ConsequenceType.PRESENTASI_ULANG,
  ConsequenceType.POIN_PASSPORT_DIKURANGI,
  ConsequenceType.PERINGATAN_TERTULIS,
  ConsequenceType.TUGAS_PENGABDIAN,
] as const;

export const createConsequenceSchema = z
  .object({
    targetUserId: cuidSchema,
    cohortId: cuidSchema,
    type: z.enum(
      ALLOWED_CONSEQUENCE_TYPES.map((t) => t.toString()) as [string, ...string[]],
      {
        errorMap: () => ({
          message:
            `Tipe konsekuensi tidak valid. Hukuman fisik, verbal, dan psikologis ` +
            `dilarang per Permen 55/2024. Nilai yang diperbolehkan: ` +
            ALLOWED_CONSEQUENCE_TYPES.join(', '),
        }),
      },
    ),
    reasonText: z.string().min(30, 'reasonText must be at least 30 characters').max(5000),
    relatedIncidentId: cuidSchema.optional(),
    deadline: z.string().datetime().optional(),
    pointsDeducted: z.number().int().min(1).max(100).optional(),
    forbiddenActCode: z.string().max(50).optional(),
  })
  .superRefine((data, ctx) => {
    // POIN_PASSPORT_DIKURANGI requires pointsDeducted
    if (data.type === ConsequenceType.POIN_PASSPORT_DIKURANGI) {
      if (!data.pointsDeducted) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pointsDeducted'],
          message: 'pointsDeducted is required for POIN_PASSPORT_DIKURANGI',
        });
      }
    }
    // REFLEKSI, PRESENTASI, TUGAS_PENGABDIAN require deadline
    if (
      data.type === ConsequenceType.REFLEKSI_500_KATA ||
      data.type === ConsequenceType.PRESENTASI_ULANG ||
      data.type === ConsequenceType.TUGAS_PENGABDIAN
    ) {
      if (!data.deadline) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deadline'],
          message: `deadline is required for ${data.type}`,
        });
      }
    }
  });

export type CreateConsequenceInput = z.infer<typeof createConsequenceSchema>;

// ---- Consequence Submit (maba) ----

export const submitConsequenceSchema = z.object({
  notesAfter: z.string().min(1).max(10000),
  attachmentKey: z.string().max(500).optional(),
});

export type SubmitConsequenceInput = z.infer<typeof submitConsequenceSchema>;

// ---- Consequence Review (SC) ----

export const reviewConsequenceSchema = z.object({
  decision: z.enum(['APPROVE', 'REQUEST_REVISION']),
  reviewNote: z.string().min(5).max(2000).optional(),
});

export type ReviewConsequenceInput = z.infer<typeof reviewConsequenceSchema>;

// ---- Extend Deadline (SC) ----

export const extendDeadlineSchema = z.object({
  newDeadline: z.string().datetime(),
  reason: z.string().min(5).max(500).optional(),
});

// ---- Attachment presign ----

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const attachmentPresignSchema = z.object({
  filename: z.string().max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: 'Only JPEG, PNG, WEBP, and PDF are allowed' }),
  }),
  sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024, 'File size must be ≤ 5 MB'),
});

export const attachmentConfirmSchema = z.object({
  s3Key: z.string().min(1).max(1024),
});

// ---- List incidents query ----

export const listIncidentsQuerySchema = z.object({
  severity: z.nativeEnum(IncidentSeverity).optional(),
  status: z.string().optional(),
  cohortId: cuidSchema.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
