/**
 * src/lib/journal/word-count.ts
 * NAWASENA M04 — Word count utility for journal entries.
 *
 * Handles Indonesian + English text, multi-whitespace, unicode, emoji.
 */

/**
 * Count words in a single text string.
 * - Trims leading/trailing whitespace
 * - Splits on one or more whitespace characters
 * - Filters empty segments (handles multi-space, newlines, tabs)
 * - Empty or whitespace-only string returns 0
 *
 * @param text - Input text string
 * @returns Word count (non-negative integer)
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Count total words across all three journal fields.
 *
 * @param fields - Journal field contents
 * @returns Total word count
 */
export function countTotalWords(fields: {
  whatHappened: string;
  soWhat: string;
  nowWhat: string;
}): number {
  return (
    countWords(fields.whatHappened) +
    countWords(fields.soWhat) +
    countWords(fields.nowWhat)
  );
}

/** Minimum word count required for journal submission */
export const MIN_JOURNAL_WORDS = 300;

/**
 * Check if a journal meets the minimum word count requirement.
 */
export function meetsMinimumWordCount(fields: {
  whatHappened: string;
  soWhat: string;
  nowWhat: string;
}): boolean {
  return countTotalWords(fields) >= MIN_JOURNAL_WORDS;
}
