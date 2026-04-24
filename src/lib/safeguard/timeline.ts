/**
 * src/lib/safeguard/timeline.ts
 * NAWASENA M10 — Timeline entry helper.
 *
 * All timeline entries are created via this module to ensure consistency.
 * Entries are append-only (no update/delete at service layer or DB level).
 */

import { Prisma, TimelineAction } from '@prisma/client';
import { TimelineEntryParams } from './types';

/**
 * Creates an append-only timeline entry within a Prisma transaction.
 *
 * @param tx — Prisma transaction client (or regular prisma client)
 * @param params — entry params
 */
export async function recordTimelineEntry(
  tx: Prisma.TransactionClient,
  params: TimelineEntryParams,
) {
  return tx.incidentTimelineEntry.create({
    data: {
      organizationId: params.organizationId,
      incidentId: params.incidentId,
      actorId: params.actorId,
      action: params.action,
      oldValue: params.oldValue ? (params.oldValue as unknown as Prisma.InputJsonValue) : undefined,
      newValue: params.newValue ? (params.newValue as unknown as Prisma.InputJsonValue) : undefined,
      fieldName: params.fieldName,
      noteText: params.noteText,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

// ---- Typed helpers per action ----

export function makeCreatedEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.CREATED };
}

export function makeClaimedEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.CLAIMED_FOR_REVIEW };
}

export function makeStatusChangedEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.STATUS_CHANGED };
}

export function makeNoteAddedEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.NOTE_ADDED };
}

export function makeFieldUpdatedEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.FIELD_UPDATED };
}

export function makeAttachmentAddedEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.ATTACHMENT_ADDED };
}

export function makeAttachmentDownloadedEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.ATTACHMENT_DOWNLOADED };
}

export function makeEscalatedEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.ESCALATED_TO_SATGAS };
}

export function makeRetractedByReporterEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.RETRACTED_BY_REPORTER };
}

export function makeRetractedBySCEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.RETRACTED_BY_SC };
}

export function makePembinaAnnotationEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.PEMBINA_ANNOTATION_ADDED };
}

export function makeResolvedEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.RESOLVED };
}

export function makeReopenedEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.REOPENED };
}

export function makeSupersededEntry(
  params: Omit<TimelineEntryParams, 'action'>,
): TimelineEntryParams {
  return { ...params, action: TimelineAction.SUPERSEDED };
}
