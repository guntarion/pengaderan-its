/**
 * src/lib/anon-report/schemas.ts
 * NAWASENA M12 — Shared Zod schemas for anonymous channel.
 *
 * Design principles:
 * - Strict mode: unknown/extra fields are STRIPPED (not rejected)
 *   to prevent accidentally capturing identifying information
 * - No email, phone, name, IP, fingerprint fields allowed
 * - bodyText minimum 20 characters
 */

import { z } from 'zod';
import { AnonCategory, AnonSeverity } from '@prisma/client';

// ============================================================
// Submit Schema — POST /api/anon-reports
// ============================================================

/**
 * Schema for anonymous report submission.
 *
 * Uses .strip() (default) to silently drop unknown fields.
 * This ensures even if a malicious client sends identifying fields,
 * they are silently discarded before reaching the handler.
 */
export const submitSchema = z
  .object({
    cohortId: z.string().min(1, 'Kohort wajib dipilih'),
    category: z.nativeEnum(AnonCategory, {
      errorMap: () => ({ message: 'Kategori tidak valid' }),
    }),
    bodyText: z
      .string()
      .min(20, 'Laporan minimal 20 karakter')
      .max(5000, 'Laporan maksimal 5000 karakter'),
    reporterSeverity: z.nativeEnum(AnonSeverity).optional(),
    attachmentTmpKey: z
      .string()
      .regex(/^anon\/uploads\/[a-f0-9-]+\.(jpg|jpeg|png|pdf)$/i, 'Format kunci lampiran tidak valid')
      .optional(),
    captchaToken: z.string().min(1, 'Captcha token diperlukan'),
  })
  .strict(); // Reject any unexpected fields

export type SubmitInput = z.infer<typeof submitSchema>;

// ============================================================
// Status Lookup Schema — GET /api/anon-reports/status/[code]
// ============================================================

export const statusLookupSchema = z.object({
  code: z
    .string()
    .regex(/^NW-[A-Z0-9]{8}$/, 'Format kode tidak valid. Contoh: NW-A1B2C3D4'),
});

export type StatusLookupInput = z.infer<typeof statusLookupSchema>;

// ============================================================
// Status Response Schema — only allowlisted fields
// ============================================================

/**
 * The ONLY fields returned to the public status tracker.
 * Any addition to this schema requires 2-reviewer sign-off.
 */
export const statusResponseSchema = z.object({
  status: z.nativeEnum(AnonSeverity),
  category: z.nativeEnum(AnonCategory),
  severity: z.nativeEnum(AnonSeverity),
  acknowledgedAt: z.date().nullable(),
  recordedAt: z.date(),
  publicNote: z.string().max(300).nullable(),
  closedAt: z.date().nullable(),
});

export type StatusResponse = z.infer<typeof statusResponseSchema>;

// ============================================================
// Presign Schema — POST /api/anon-reports/presign
// ============================================================

export const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(['image/jpeg', 'image/png', 'application/pdf'], {
    errorMap: () => ({ message: 'Tipe file tidak didukung. Gunakan JPEG, PNG, atau PDF.' }),
  }),
  captchaToken: z.string().min(1, 'Captcha token diperlukan'),
});

export type PresignInput = z.infer<typeof presignSchema>;

// ============================================================
// Acknowledge Schema — POST /api/anon-reports/[id]/acknowledge
// ============================================================

export const acknowledgeSchema = z.object({
  note: z.string().max(500).optional(),
});

// ============================================================
// Resolve Schema — POST /api/anon-reports/[id]/resolve
// ============================================================

export const resolveSchema = z.object({
  resolutionNotes: z.string().min(10, 'Catatan resolusi minimal 10 karakter').max(2000),
  publicNote: z.string().max(300).optional(),
  closedAt: z.string().datetime().optional(),
});

// ============================================================
// Notes Schema — POST /api/anon-reports/[id]/notes
// ============================================================

export const addNoteSchema = z
  .object({
    type: z.enum(['internal', 'public', 'satgas']),
    content: z.string().min(1).max(2000),
  })
  .refine(
    (data) => {
      // Public notes get extra validation (shown to reporter)
      if (data.type === 'public') {
        return data.content.length >= 5;
      }
      return true;
    },
    { message: 'Catatan publik minimal 5 karakter', path: ['content'] },
  );

// ============================================================
// PATCH Report Schema — PATCH /api/anon-reports/[id]
// ============================================================

export const patchReportSchema = z
  .object({
    blmSeverityOverride: z.nativeEnum(AnonSeverity).optional(),
    blmCategoryOverride: z.nativeEnum(AnonCategory).optional(),
    publicNote: z.string().max(300).nullable().optional(),
    satgasNotes: z.string().max(5000).nullable().optional(),
  })
  .strict();

// ============================================================
// Bulk Delete Schema — POST /api/anon-reports/superadmin/bulk-delete
// ============================================================

export const bulkDeleteSchema = z.object({
  reportIds: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().min(10, 'Alasan penghapusan minimal 10 karakter').max(500),
});

// ============================================================
// Keyword Config Schema — PATCH /api/anon-reports/superadmin/keyword-config
// ============================================================

export const keywordConfigSchema = z.object({
  key: z.enum(['severe_keywords', 'profanity_list']),
  value: z.array(z.string().min(1).max(100)).min(1).max(500),
});
