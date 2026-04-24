/**
 * src/lib/m09-logbook/validation/kp-daily.schema.ts
 * NAWASENA M09 — Zod schema for KP Daily Stand-up Log.
 */

import { z } from 'zod';

export const RED_FLAG_VALUES = [
  'MENANGIS',
  'SHUTDOWN',
  'KONFLIK',
  'INJURY',
  'WITHDRAW',
  'LAINNYA',
] as const;

export type RedFlagType = (typeof RED_FLAG_VALUES)[number];

export const kpDailySchema = z.object({
  moodAvg: z.number().int().min(1).max(5, {
    message: 'Mood harus antara 1-5',
  }),
  redFlagsObserved: z.array(
    z.enum(RED_FLAG_VALUES, {
      errorMap: () => ({ message: 'Red flag tidak valid' }),
    }),
  ).default([]),
  redFlagOther: z
    .string()
    .max(100, { message: 'Keterangan maksimal 100 karakter' })
    .optional()
    .nullable(),
  anecdoteShort: z
    .string()
    .max(500, { message: 'Anekdot maksimal 500 karakter' })
    .optional()
    .nullable(),
  // Optional: client passes these from the GET response for snapshot
  suggestedMood: z.number().optional().nullable(),
  responderCount: z.number().int().optional().nullable(),
  totalMembers: z.number().int().optional().nullable(),
});

export type KPDailyInput = z.infer<typeof kpDailySchema>;

/** Severe red flags that trigger M10 cascade */
export const SEVERE_RED_FLAGS: RedFlagType[] = ['INJURY', 'SHUTDOWN'];

/** Normal red flags that trigger M15 HIGH notification (no cascade) */
export const NORMAL_RED_FLAGS: RedFlagType[] = ['MENANGIS', 'KONFLIK', 'WITHDRAW', 'LAINNYA'];

/**
 * Check if payload contains any severe red flags.
 */
export function hasSevereRedFlags(flags: string[]): boolean {
  return flags.some((f) => SEVERE_RED_FLAGS.includes(f as RedFlagType));
}

/**
 * Check if payload contains any normal (non-severe) red flags.
 */
export function hasNormalRedFlags(flags: string[]): boolean {
  return flags.some((f) => NORMAL_RED_FLAGS.includes(f as RedFlagType));
}
