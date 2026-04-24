/**
 * src/lib/time-capsule/service.ts
 * NAWASENA M07 — Time Capsule service layer.
 *
 * createEntry: creates published entry, sets editableUntil = now + 24h
 * updateEntry: validates editableUntil > now, throws EDIT_WINDOW_EXPIRED
 * listForUser: pagination + filter mood/shared/search
 * getEntryById: includes share resolver check
 * upsertDraft: creates/updates draft (publishedAt = null)
 */

import { prisma } from '@/utils/prisma';
import { BadRequestError, NotFoundError } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import { isEditable, computeEditableUntil } from './edit-window';
import { assertCanReadEntry } from './share-resolver';
import { invalidatePortfolio } from '@/lib/portfolio/cache';
import type { Prisma } from '@prisma/client';

const log = createLogger('time-capsule:service');

interface CurrentUser {
  id: string;
  role: string;
}

export interface CreateEntryInput {
  title?: string;
  body: string;
  mood?: number;
  sharedWithKasuh?: boolean;
}

export interface UpdateEntryInput {
  title?: string;
  body?: string;
  mood?: number;
  sharedWithKasuh?: boolean;
}

export interface ListEntriesFilter {
  mood?: number;
  sharedWithKasuh?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Create a new published Time Capsule entry.
 */
export async function createEntry(
  userId: string,
  cohortId: string,
  orgId: string,
  input: CreateEntryInput,
) {
  const now = new Date();
  const editableUntil = computeEditableUntil(now);

  const entry = await prisma.timeCapsuleEntry.create({
    data: {
      organizationId: orgId,
      cohortId,
      userId,
      title: input.title ?? null,
      body: input.body,
      mood: input.mood ?? null,
      sharedWithKasuh: input.sharedWithKasuh ?? false,
      publishedAt: now,
      editableUntil,
    },
  });

  log.info('Time Capsule entry created', { entryId: entry.id, userId });

  // Invalidate portfolio cache
  await invalidatePortfolio(userId, cohortId);

  return entry;
}

/**
 * Update an existing Time Capsule entry (within 24h window).
 */
export async function updateEntry(
  entryId: string,
  userId: string,
  cohortId: string,
  input: UpdateEntryInput,
) {
  const entry = await prisma.timeCapsuleEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry || entry.userId !== userId) {
    throw NotFoundError('Time Capsule Entry');
  }

  if (!isEditable(entry)) {
    const err = BadRequestError('Window edit 24 jam telah berakhir. Kamu tidak dapat mengubah entry ini.');
    (err as Error & { code: string }).code = 'EDIT_WINDOW_EXPIRED';
    throw err;
  }

  const updated = await prisma.timeCapsuleEntry.update({
    where: { id: entryId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.body !== undefined && { body: input.body }),
      ...(input.mood !== undefined && { mood: input.mood }),
      ...(input.sharedWithKasuh !== undefined && { sharedWithKasuh: input.sharedWithKasuh }),
    },
  });

  log.info('Time Capsule entry updated', { entryId, userId });

  // Invalidate portfolio cache
  await invalidatePortfolio(userId, cohortId);

  return updated;
}

/**
 * List Time Capsule entries for a user with optional filters.
 */
export async function listForUser(
  userId: string,
  cohortId: string,
  filters: ListEntriesFilter = {},
) {
  const { mood, sharedWithKasuh, search, page = 1, limit = 20 } = filters;

  const where: Prisma.TimeCapsuleEntryWhereInput = {
    userId,
    cohortId,
    publishedAt: { not: null },
  };

  if (mood !== undefined) where.mood = mood;
  if (sharedWithKasuh !== undefined) where.sharedWithKasuh = sharedWithKasuh;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { body: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [entries, total] = await Promise.all([
    prisma.timeCapsuleEntry.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        attachments: {
          select: { id: true, originalFilename: true, mimeType: true, size: true },
        },
      },
    }),
    prisma.timeCapsuleEntry.count({ where }),
  ]);

  return { entries, total, page, limit };
}

/**
 * Get a single Time Capsule entry by ID with share gate check.
 */
export async function getEntryById(
  entryId: string,
  currentUser: CurrentUser,
) {
  const entry = await prisma.timeCapsuleEntry.findUnique({
    where: { id: entryId },
    include: {
      attachments: {
        select: {
          id: true,
          storageKey: true,
          originalFilename: true,
          mimeType: true,
          size: true,
          uploadedAt: true,
        },
      },
    },
  });

  if (!entry) throw NotFoundError('Time Capsule Entry');

  // App-layer share gate check (defense-in-depth after RLS)
  await assertCanReadEntry(entry, currentUser);

  return entry;
}

/**
 * Upsert a draft Time Capsule entry (publishedAt = null).
 */
export async function upsertDraft(
  userId: string,
  cohortId: string,
  orgId: string,
  payload: Partial<CreateEntryInput>,
) {
  // Find existing draft
  const existingDraft = await prisma.timeCapsuleEntry.findFirst({
    where: { userId, cohortId, publishedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (existingDraft) {
    const updated = await prisma.timeCapsuleEntry.update({
      where: { id: existingDraft.id },
      data: {
        ...(payload.title !== undefined && { title: payload.title }),
        ...(payload.body !== undefined && { body: payload.body }),
        ...(payload.mood !== undefined && { mood: payload.mood }),
        ...(payload.sharedWithKasuh !== undefined && { sharedWithKasuh: payload.sharedWithKasuh }),
      },
    });
    log.debug('Draft updated', { draftId: updated.id, userId });
    return updated;
  }

  // Create new draft (editableUntil set far in future since it's a draft)
  const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const draft = await prisma.timeCapsuleEntry.create({
    data: {
      organizationId: orgId,
      cohortId,
      userId,
      title: payload.title ?? null,
      body: payload.body ?? '',
      mood: payload.mood ?? null,
      sharedWithKasuh: payload.sharedWithKasuh ?? false,
      publishedAt: null,
      editableUntil: farFuture,
    },
  });

  log.debug('Draft created', { draftId: draft.id, userId });
  return draft;
}
