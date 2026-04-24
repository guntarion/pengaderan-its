/**
 * src/lib/event-execution/schemas.ts
 * NAWASENA M08 — Zod validation schemas for event execution operations.
 */

import { z } from 'zod';

// ============================================================
// Instance creation
// ============================================================

export const createInstanceSchema = z.object({
  kegiatanId: z.string().min(1, 'Kegiatan wajib dipilih'),
  scheduledAt: z.string().datetime({ message: 'Tanggal jadwal tidak valid' }),
  location: z.string().min(1, 'Lokasi wajib diisi').max(500, 'Lokasi max 500 karakter'),
  capacity: z.number().int().positive().max(10000).optional().nullable(),
  picRoleHint: z.string().max(200).optional().nullable(),
  notesPanitia: z.string().max(5000).optional().nullable(),
  materiLinkUrl: z.string().url('URL materi tidak valid').optional().nullable(),
  cohortId: z.string().optional().nullable(),
});

export type CreateInstanceInput = z.infer<typeof createInstanceSchema>;

// ============================================================
// Kegiatan picker query
// ============================================================

export const kegiatanPickerQuerySchema = z.object({
  search: z.string().max(200).optional(),
  fase: z.string().optional(),
  kategori: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type KegiatanPickerQuery = z.infer<typeof kegiatanPickerQuerySchema>;

export type CreateQRSessionInput = z.infer<typeof createQRSessionSchema>;
export type RevokeQRSessionInput = z.infer<typeof revokeQRSessionSchema>;
export type AttendanceStampInput = z.infer<typeof attendanceStampSchema>;

// ============================================================
// QR session
// ============================================================

export const createQRSessionSchema = z.object({
  instanceId: z.string().min(1, 'instanceId wajib diisi'),
  ttlHours: z.number().int().min(1).max(12).default(2),
});

export const revokeQRSessionSchema = z.object({
  sessionId: z.string().min(1, 'sessionId wajib diisi'),
  reason: z.string().min(5, 'Alasan revoke wajib diisi').max(500).optional(),
});

// ============================================================
// Attendance stamp (Maba scan)
// ============================================================

export const attendanceStampSchema = z.object({
  /** Full QR URL string or "nawasena://..." payload — parsed server-side */
  qrPayload: z.string().min(1, 'QR payload wajib diisi'),
  clientScanId: z.string().uuid('clientScanId harus UUID v4').optional(),
  scannedAt: z.string().datetime().optional(),
  scanLocation: z.string().max(500).optional(),
  shortCode: z.string().length(6).optional(), // manual entry fallback
});

// ============================================================
// Attendance manual/bulk
// ============================================================

export const manualMarkSchema = z.object({
  userId: z.string().min(1, 'userId wajib diisi'),
  status: z.enum(['HADIR', 'IZIN', 'SAKIT', 'ALPA']),
  notes: z.string().max(200, 'Catatan max 200 karakter').optional().nullable(),
});

export const bulkMarkSchema = z.object({
  confirm: z.boolean().default(true),
});

// ============================================================
// Output upload
// ============================================================

export const initFileUploadSchema = z.object({
  filename: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive().max(52428800, 'File max 50MB'),
  caption: z.string().min(1).max(200, 'Caption max 200 karakter'),
});

export const createUrlOutputSchema = z.object({
  type: z.enum(['LINK', 'VIDEO', 'REPO']),
  url: z.string().url('URL tidak valid').min(1).max(2000),
  caption: z.string().min(1).max(200, 'Caption max 200 karakter'),
});

// ============================================================
// Evaluation
// ============================================================

export const submitEvaluationSchema = z.object({
  attendancePctOverride: z.number().min(0).max(1).optional().nullable(),
  attendancePctOverrideReason: z.string().min(1).max(1000).optional().nullable(),
  npsScoreOverride: z.number().min(0).max(10).optional().nullable(),
  npsScoreOverrideReason: z.string().min(1).max(1000).optional().nullable(),
  scoreL2agg: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
}).refine((data) => {
  // If override provided, reason must be present
  if (data.attendancePctOverride !== null && data.attendancePctOverride !== undefined) {
    if (!data.attendancePctOverrideReason) return false;
  }
  if (data.npsScoreOverride !== null && data.npsScoreOverride !== undefined) {
    if (!data.npsScoreOverrideReason) return false;
  }
  return true;
}, { message: 'Alasan override wajib diisi saat melakukan override nilai prefill' });

export type SubmitEvaluationInput = z.infer<typeof submitEvaluationSchema>;
export type InitFileUploadInput = z.infer<typeof initFileUploadSchema>;
export type CreateUrlOutputInput = z.infer<typeof createUrlOutputSchema>;
export type ManualMarkInput = z.infer<typeof manualMarkSchema>;
export type LifecycleInput = z.infer<typeof lifecycleSchema>;
export type LifecycleRevertInput = z.infer<typeof lifecycleRevertSchema>;
export type CapacityRaiseInput = z.infer<typeof capacityRaiseSchema>;

// ============================================================
// Lifecycle transitions
// ============================================================

export const lifecycleSchema = z.object({
  action: z.enum(['start', 'finish', 'cancel', 'reschedule']),
  version: z.number().int().nonnegative(), // optimistic lock
  reason: z.string().min(20, 'Alasan minimal 20 karakter').optional().nullable(),
  newScheduledAt: z.string().datetime().optional().nullable(), // for reschedule
});

export const lifecycleRevertSchema = z.object({
  fromStatus: z.enum(['DONE', 'CANCELLED', 'RUNNING', 'PLANNED']),
  toStatus: z.enum(['PLANNED', 'RUNNING', 'DONE', 'CANCELLED']),
  reason: z.string().min(20, 'Alasan revert wajib diisi (min 20 karakter)'),
  version: z.number().int().nonnegative(),
});

// ============================================================
// Capacity raise
// ============================================================

export const capacityRaiseSchema = z.object({
  newCapacity: z.number().int().positive().max(10000).nullable(),
});
