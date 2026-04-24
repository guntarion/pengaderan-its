/**
 * src/lib/m09-logbook/validation/kasuh-log.schema.ts
 * NAWASENA M09 — Zod schema for Kasuh biweekly logbook.
 *
 * Discriminated union by attendance type (MET / NOT_MET).
 */

import { z } from 'zod';

// Base fields common to both attendance types
const baseSchema = z.object({
  pairId: z.string().min(1),
  cycleNumber: z.number().int().min(1),
});

// MET: Kasuh bertemu adik asuh
const metSchema = baseSchema.extend({
  attendance: z.literal('MET'),
  meetingDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  reflection: z.string().min(30, {
    message: 'Refleksi minimal 30 karakter untuk pertemuan yang terjadi',
  }),
  flagUrgent: z.boolean().default(false),
  followupNotes: z.string().optional().nullable(),
});

// NOT_MET: Kasuh belum bertemu adik asuh
const notMetSchema = baseSchema.extend({
  attendance: z.literal('NOT_MET'),
  attendanceReason: z
    .string()
    .min(10, { message: 'Alasan tidak bertemu minimal 10 karakter' })
    .max(200, { message: 'Alasan tidak bertemu maksimal 200 karakter' }),
  reflection: z.string().optional().nullable(),
  flagUrgent: z.boolean().default(false).optional(),
  followupNotes: z.string().optional().nullable(),
});

// Discriminated union
export const kasuhLogSchema = z.discriminatedUnion('attendance', [metSchema, notMetSchema]);

export type KasuhLogInput = z.infer<typeof kasuhLogSchema>;
export type KasuhLogMetInput = z.infer<typeof metSchema>;
export type KasuhLogNotMetInput = z.infer<typeof notMetSchema>;
