/**
 * src/lib/pulse/local-date.ts
 * NAWASENA M04 — Timezone-aware local date helper.
 *
 * Converts a UTC DateTime to a YYYY-MM-DD string in the given IANA timezone.
 * Uses date-fns-tz for robust timezone handling.
 */

import { formatInTimeZone } from 'date-fns-tz';

const DEFAULT_TIMEZONE = 'Asia/Jakarta';

/**
 * Get the local date string (YYYY-MM-DD) for a given UTC datetime in the specified timezone.
 *
 * @param recordedAtUtc - UTC Date object
 * @param timezone      - IANA timezone string (e.g. 'Asia/Jakarta')
 * @returns Date string in YYYY-MM-DD format for the local timezone
 */
export function getLocalDateString(recordedAtUtc: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(recordedAtUtc, timezone, 'yyyy-MM-dd');
}

/**
 * Get the local Date object at midnight UTC for the given local date string.
 * Useful for storing a DATE type in Postgres.
 *
 * @param dateStr  - 'YYYY-MM-DD' string
 * @returns Date object at midnight UTC that Prisma stores as DATE
 */
export function localDateStringToDate(dateStr: string): Date {
  // Parse as UTC midnight — Postgres DATE columns will store only the date portion
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Get today's local date string in the given timezone.
 */
export function getTodayLocalDateString(timezone: string = DEFAULT_TIMEZONE): string {
  return getLocalDateString(new Date(), timezone);
}

/**
 * Get the organization timezone from org settings JSON.
 * Falls back to 'Asia/Jakarta' if not set.
 */
export function getOrgTimezone(orgSettings: unknown): string {
  if (
    orgSettings &&
    typeof orgSettings === 'object' &&
    'timezone' in orgSettings &&
    typeof (orgSettings as Record<string, unknown>).timezone === 'string'
  ) {
    return (orgSettings as { timezone: string }).timezone;
  }
  return DEFAULT_TIMEZONE;
}
