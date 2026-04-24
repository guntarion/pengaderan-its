/**
 * src/lib/anon-report/profanity-list.ts
 * NAWASENA M12 — Profanity word list for spam detection.
 *
 * IMPORTANT:
 * - This list is used ONLY for ratio-based spam detection (>70% profanity = reject).
 * - Content that contains some profanity but is substantive is NOT rejected.
 * - Do NOT reject reports just because they contain profanity words.
 * - The list is a starting point; SUPERADMIN can update via AnonReportConfig table.
 *
 * Design: List is initialized from this file but can be overridden at runtime
 * by loading from the database (AnonReportConfig key='profanity_list').
 */

/**
 * Default profanity list (Bahasa Indonesia + common English).
 * This is the fallback when database config is unavailable.
 */
export const DEFAULT_PROFANITY_LIST: string[] = [
  // Bahasa Indonesia
  'anjing',
  'anjir',
  'babi',
  'bangsat',
  'goblok',
  'tolol',
  'idiot',
  'bodoh',
  'kampret',
  'tai',
  'kontol',
  'memek',
  'bajingan',
  'keparat',
  'sialan',
  'kurang ajar',
  'setan',
  'brengsek',
  'jancok',
  'asu',
];

/**
 * Load profanity list from environment.
 * Priority: database config (loaded externally) > default list.
 */
export function getDefaultProfanityList(): string[] {
  return [...DEFAULT_PROFANITY_LIST];
}
