/**
 * src/lib/anon-report/profanity.ts
 * NAWASENA M12 — Low-quality content detection for spam prevention.
 *
 * Rejection criteria (soft reject — user gets a friendly message):
 *   1. Content too short (< 20 characters)
 *   2. Content is > 70% profanity words (spam)
 *
 * This does NOT block genuine reports that contain some profanity.
 * The goal is to filter nonsense/spam submissions, not legitimate grievances.
 */

import { getDefaultProfanityList } from '@/lib/anon-report/profanity-list';
import { createLogger } from '@/lib/logger';

const log = createLogger('anon-profanity');

export type LowQualityReason = 'MIN_LENGTH' | 'LOW_QUALITY';

export interface LowQualityResult {
  rejected: boolean;
  reason?: LowQualityReason;
  /** Human-readable message in Bahasa Indonesia for the reporter */
  message?: string;
}

const USER_MESSAGES: Record<LowQualityReason, string> = {
  MIN_LENGTH: 'Laporan minimal 20 karakter. Mohon jelaskan masalah Anda dengan lebih detail.',
  LOW_QUALITY:
    'Laporan tidak dapat diproses karena terlalu singkat atau tidak informatif. Mohon jelaskan situasi yang Anda alami dengan lebih detail.',
};

/**
 * Check if a report body is probably low-quality spam.
 *
 * @param body - The raw body text from the reporter
 * @param customProfanityList - Optional custom list (from DB config)
 * @returns Rejection result with reason and user-friendly message
 */
export function isProbablyLowQuality(
  body: string,
  customProfanityList?: string[],
): LowQualityResult {
  const normalized = body.trim();

  // Rule 1: Minimum length check
  if (normalized.length < 20) {
    log.debug('Report rejected: too short', { length: normalized.length });
    return {
      rejected: true,
      reason: 'MIN_LENGTH',
      message: USER_MESSAGES.MIN_LENGTH,
    };
  }

  // Rule 2: Profanity ratio check
  const profanityList = customProfanityList ?? getDefaultProfanityList();
  const words = normalized.toLowerCase().split(/\s+/);

  if (words.length === 0) {
    return { rejected: false };
  }

  const profanityCount = words.filter((word) =>
    profanityList.includes(word.replace(/[^a-zÀ-ɏ]/g, '')),
  ).length;

  const profanityRatio = profanityCount / words.length;

  if (profanityRatio > 0.7) {
    log.debug('Report rejected: high profanity ratio', {
      profanityCount,
      totalWords: words.length,
      ratio: profanityRatio.toFixed(2),
    });
    return {
      rejected: true,
      reason: 'LOW_QUALITY',
      message: USER_MESSAGES.LOW_QUALITY,
    };
  }

  return { rejected: false };
}
