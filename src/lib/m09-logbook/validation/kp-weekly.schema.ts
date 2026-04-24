/**
 * src/lib/m09-logbook/validation/kp-weekly.schema.ts
 * NAWASENA M09 — Zod schema for KP Weekly Debrief.
 */

import { z } from 'zod';

const MIN_TEXT_CHARS = 50;

export const kpWeeklySchema = z.object({
  weekNumber: z.number().int().min(1).max(53),
  yearNumber: z.number().int().min(2020).max(2100),
  whatWorked: z
    .string()
    .min(MIN_TEXT_CHARS, {
      message: `"Apa yang berjalan baik" minimal ${MIN_TEXT_CHARS} karakter`,
    }),
  whatDidnt: z
    .string()
    .min(MIN_TEXT_CHARS, {
      message: `"Apa yang tidak berjalan" minimal ${MIN_TEXT_CHARS} karakter`,
    }),
  changesNeeded: z
    .string()
    .min(MIN_TEXT_CHARS, {
      message: `"Perubahan yang dibutuhkan" minimal ${MIN_TEXT_CHARS} karakter`,
    }),
});

export type KPWeeklyInput = z.infer<typeof kpWeeklySchema>;
