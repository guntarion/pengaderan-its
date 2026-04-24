/**
 * src/lib/follow-up/service.ts
 * NAWASENA M04 — Follow-up record service.
 *
 * Operations:
 * - createFollowUp: record a follow-up action on a red-flag event
 * - listFollowUps: list follow-ups for a red-flag event
 *
 * Business rules:
 * - summary must be at least 20 characters
 * - recording a follow-up transitions RedFlagEvent to FOLLOWED_UP
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { FollowUpContactType } from '@prisma/client';

const log = createLogger('follow-up-service');

const MIN_SUMMARY_LENGTH = 20;

export interface CreateFollowUpInput {
  organizationId: string;
  redFlagEventId: string;
  actorUserId: string;
  subjectUserId: string;
  contactType: FollowUpContactType;
  summary: string;
  nextAction?: string | null;
}

/**
 * Record a follow-up action on a red-flag event.
 * Transitions the RedFlagEvent status to FOLLOWED_UP.
 * Summary must be at least 20 characters.
 */
export async function createFollowUp(input: CreateFollowUpInput) {
  if (input.summary.trim().length < MIN_SUMMARY_LENGTH) {
    throw new Error(`Follow-up summary must be at least ${MIN_SUMMARY_LENGTH} characters`);
  }

  log.info('Creating follow-up record', {
    redFlagEventId: input.redFlagEventId,
    actorUserId: input.actorUserId,
    contactType: input.contactType,
  });

  // Create follow-up + update event status in one transaction
  const [followUp] = await prisma.$transaction([
    prisma.followUpRecord.create({
      data: {
        organizationId: input.organizationId,
        redFlagEventId: input.redFlagEventId,
        actorUserId: input.actorUserId,
        subjectUserId: input.subjectUserId,
        contactType: input.contactType,
        summary: input.summary.trim(),
        nextAction: input.nextAction ?? null,
      },
    }),
    prisma.redFlagEvent.update({
      where: { id: input.redFlagEventId },
      data: {
        status: 'FOLLOWED_UP',
        followedUpAt: new Date(),
        followedUpById: input.actorUserId,
      },
    }),
  ]);

  log.info('Follow-up created', {
    followUpId: followUp.id,
    redFlagEventId: input.redFlagEventId,
  });

  return followUp;
}

/**
 * List all follow-ups for a red-flag event.
 */
export async function listFollowUps(redFlagEventId: string) {
  return prisma.followUpRecord.findMany({
    where: { redFlagEventId },
    orderBy: { followedUpAt: 'desc' },
    include: {
      actor: {
        select: { id: true, fullName: true, displayName: true },
      },
    },
  });
}
