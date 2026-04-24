/**
 * src/lib/safeguard/consequences/passport-cascade.ts
 * NAWASENA M10 — Trigger M05 passport point deduction cascade.
 *
 * Feature flag: M10_M05_PASSPORT_CASCADE_ENABLED
 * When disabled: marks passportCascadeStatus=SKIPPED_FLAG_OFF
 *
 * Retry strategy: 3× exponential backoff (100ms → 200ms → 400ms)
 * On persistent failure: status=FAILED + log.error for alerting
 *
 * Contract with M05: calls submitPassportEntry with EvidenceType.SYSTEM_DEDUCTION
 * via the in-process submit.service (no HTTP round-trip).
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { PassportCascadeStatus } from '@prisma/client';

const log = createLogger('safeguard:consequences:passport-cascade');

const RETRY_DELAYS_MS = [100, 200, 400];

/** Feature flag check */
function isCascadeEnabled(): boolean {
  return process.env.M10_M05_PASSPORT_CASCADE_ENABLED === 'true';
}

/**
 * Trigger a passport point deduction for a consequence of type POIN_PASSPORT_DIKURANGI.
 *
 * This function is designed to be called non-blocking (fire-and-forget from assign.ts).
 * It handles its own retry logic and updates the consequence record status.
 *
 * @param consequenceLogId - ID of the ConsequenceLog to cascade
 */
export async function triggerPassportCascade(consequenceLogId: string): Promise<void> {
  log.info('Starting passport cascade', { consequenceLogId });

  // ---- Feature flag check ----
  if (!isCascadeEnabled()) {
    log.info('Passport cascade disabled (M10_M05_PASSPORT_CASCADE_ENABLED != true)', {
      consequenceLogId,
    });
    await prisma.consequenceLog.update({
      where: { id: consequenceLogId },
      data: { passportCascadeStatus: PassportCascadeStatus.SKIPPED_FLAG_OFF },
    });
    return;
  }

  // ---- Fetch consequence ----
  const consequence = await prisma.consequenceLog.findUnique({
    where: { id: consequenceLogId },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      cohortId: true,
      pointsDeducted: true,
      reasonText: true,
      relatedIncidentId: true,
      passportCascadeStatus: true,
    },
  });

  if (!consequence) {
    log.error('Consequence not found for passport cascade', { consequenceLogId });
    return;
  }

  if (!consequence.pointsDeducted || consequence.pointsDeducted <= 0) {
    log.warn('No pointsDeducted on consequence — skipping cascade', { consequenceLogId });
    await prisma.consequenceLog.update({
      where: { id: consequenceLogId },
      data: {
        passportCascadeStatus: PassportCascadeStatus.SKIPPED_FLAG_OFF,
        passportCascadeError: 'pointsDeducted is null or zero',
      },
    });
    return;
  }

  // ---- Already processed ----
  if (consequence.passportCascadeStatus === PassportCascadeStatus.APPLIED) {
    log.info('Passport cascade already applied — skipping', { consequenceLogId });
    return;
  }

  // ---- Retry loop ----
  let lastError: unknown = null;
  let passportEntryId: string | null = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    try {
      // Dynamically import M05 submit service to avoid circular dependencies
      // and to allow graceful failure if M05 is not available
      const { submitPassportEntry } = await import('@/lib/passport/submit.service');

      const result = await submitPassportEntry({
        userId: consequence.userId,
        organizationId: consequence.organizationId,
        cohortId: consequence.cohortId,
        // Lookup a safeguard-penalty passport item or use a synthetic itemId
        // Using a well-known system item ID for safeguard deductions
        itemId: process.env.M05_SAFEGUARD_PENALTY_ITEM_ID ?? 'safeguard-penalty',
        evidenceType: 'SYSTEM_DEDUCTION' as never, // M05 EvidenceType extension
        captionNote: `Konsekuensi Pedagogis M10: ${consequence.reasonText.substring(0, 100)}`,
        clientIdempotencyKey: `m10-cascade-${consequenceLogId}`,
      });

      passportEntryId = result.entryId;
      log.info('Passport cascade applied', {
        consequenceLogId,
        passportEntryId,
        attempt: attempt + 1,
      });
      break;
    } catch (err) {
      lastError = err;
      log.warn('Passport cascade attempt failed', {
        consequenceLogId,
        attempt: attempt + 1,
        error: err,
      });

      if (attempt < RETRY_DELAYS_MS.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      }
    }
  }

  // ---- Update consequence status ----
  if (passportEntryId) {
    await prisma.consequenceLog.update({
      where: { id: consequenceLogId },
      data: {
        passportCascadeStatus: PassportCascadeStatus.APPLIED,
        passportEntryId,
        passportCascadeError: null,
      },
    });

    log.info('Passport cascade status updated to APPLIED', { consequenceLogId, passportEntryId });
  } else {
    const errorMessage =
      lastError instanceof Error
        ? lastError.message
        : `Unknown error after ${RETRY_DELAYS_MS.length} attempts`;

    await prisma.consequenceLog.update({
      where: { id: consequenceLogId },
      data: {
        passportCascadeStatus: PassportCascadeStatus.FAILED,
        passportCascadeError: errorMessage,
      },
    });

    // log.error will trigger alerting in prod monitoring
    log.error('Passport cascade FAILED after all retries — manual intervention required', {
      consequenceLogId,
      userId: consequence.userId,
      pointsDeducted: consequence.pointsDeducted,
      errorMessage,
      error: lastError,
    });
  }
}
