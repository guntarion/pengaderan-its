/**
 * src/lib/notifications/send.ts
 * NAWASENA M15 — Central sendNotification public API.
 *
 * This is the single entry point for all notifications in the system.
 * Handles: preference resolution, CRITICAL override, rate-limiting, template rendering,
 * channel dispatch (parallel for CRITICAL, sequential+fallback for NORMAL),
 * retry with exponential backoff, and NotificationLog creation.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import type { ChannelType } from '@prisma/client';
import type {
  SendNotificationParams,
  SendNotificationResult,
  ChannelTarget,
  SendContext,
} from './types';
import { renderTemplate } from './render-template';
import { resolveChannels } from './resolve-preferences';
import { checkAndIncrement } from './rate-limit';
import { getChannel } from './channels/registry';

const log = createLogger('notifications:send');

const RETRY_DELAYS_MS = [1000, 5000, 30000]; // 1s, 5s, 30s
const MAX_RETRIES = 3;

/**
 * Retry wrapper with exponential backoff.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES,
  label = 'operation',
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;

      if (attempt < maxRetries) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 30000;
        log.warn('Retrying after error', {
          label,
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: err,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error(`${label} failed after ${maxRetries} retries`);
}

/**
 * Build the ChannelTarget for a given channel type.
 */
async function buildTarget(
  userId: string,
  channelType: ChannelType,
): Promise<ChannelTarget | null> {
  if (channelType === 'PUSH') {
    const subscriptions = await prisma.notificationSubscription.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    if (subscriptions.length === 0) return null;

    return {
      type: 'PUSH',
      userId,
      subscriptions,
    };
  }

  if (channelType === 'EMAIL') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });

    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
      select: { unsubscribeToken: true },
    });

    if (!user) return null;

    return {
      type: 'EMAIL',
      userId,
      email: user.email,
      name: user.fullName,
      unsubscribeToken: prefs?.unsubscribeToken ?? '',
    };
  }

  if (channelType === 'WHATSAPP') {
    // Stub — WhatsApp phone number lookup not yet implemented
    return {
      type: 'WHATSAPP',
      userId,
      phoneNumber: '', // Phase 2
    };
  }

  return null;
}

/**
 * Write a NotificationLog entry for a channel send attempt.
 */
async function writeLog(params: {
  userId: string;
  organizationId: string;
  templateKey: string;
  templateVersionId: string;
  channel: ChannelType;
  category: string;
  status: string;
  criticalOverride: boolean;
  ruleId?: string;
  ruleExecutionId?: string;
  providerMessageId?: string;
  errorMessage?: string;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        userId: params.userId,
        organizationId: params.organizationId,
        templateKey: params.templateKey,
        templateVersionId: params.templateVersionId,
        channel: params.channel as ChannelType,
        category: params.category as 'CRITICAL' | 'FORM_REMINDER' | 'NORMAL' | 'OPS',
        status: params.status as 'SENT' | 'FAILED' | 'QUEUED' | 'SENDING' | 'DELIVERED' | 'BOUNCED' | 'COMPLAINED' | 'SKIPPED_USER_OPTOUT' | 'SKIPPED_NO_SUBSCRIPTION' | 'SKIPPED_BOUNCE_COOLDOWN' | 'ESCALATED_INSTEAD_OF_SEND',
        criticalOverride: params.criticalOverride,
        ruleId: params.ruleId,
        ruleExecutionId: params.ruleExecutionId,
        providerMessageId: params.providerMessageId,
        errorMessage: params.errorMessage,
        retryCount: params.retryCount ?? 0,
        metadata: (params.metadata ?? {}) as Record<string, string | number | boolean | null>,
        sentAt: params.status === 'SENT' ? new Date() : undefined,
        failedAt: params.status === 'FAILED' ? new Date() : undefined,
      },
    });
  } catch (err) {
    // Non-fatal — log write failure should not break notification delivery
    log.error('Failed to write notification log', { error: err, params });
  }
}

/**
 * Public API — send a notification to a user.
 *
 * Handles:
 * - Preference resolution + CRITICAL override
 * - Rate limiting for FORM_REMINDER
 * - Template rendering
 * - Channel dispatch (parallel for CRITICAL, sequential for NORMAL)
 * - Retry with exponential backoff
 * - NotificationLog writes
 */
export async function sendNotification(
  params: SendNotificationParams,
): Promise<SendNotificationResult> {
  const { userId, templateKey, payload, category, ruleId, ruleExecutionId, requestId } = params;

  const notifLog = log.child({ userId, templateKey, category, requestId });
  notifLog.info('sendNotification called');

  // ---- 1. Fetch user + preferences ----
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      organizationId: true,
      fullName: true,
      email: true,
      notificationPreference: {
        select: {
          pushEnabled: true,
          emailEnabled: true,
          whatsappEnabled: true,
          emailBouncedAt: true,
          unsubscribeToken: true,
        },
      },
    },
  });

  if (!user) {
    notifLog.warn('User not found — skipping notification');
    return {
      userId,
      templateKey,
      results: [],
      escalated: false,
      skipped: true,
      skipReason: 'User not found',
    };
  }

  const prefs = user.notificationPreference ?? {
    pushEnabled: true,
    emailEnabled: true,
    whatsappEnabled: false,
    emailBouncedAt: null,
    unsubscribeToken: '',
  };

  const organizationId = user.organizationId;

  // ---- 2. Fetch template to get configured channels ----
  const template = await prisma.notificationTemplate.findFirst({
    where: {
      templateKey,
      OR: [{ organizationId }, { organizationId: null }],
    },
    orderBy: { organizationId: 'desc' }, // prefer org-specific
    select: { supportedChannels: true },
  });

  const ruleChannels: ChannelType[] = (template?.supportedChannels as ChannelType[]) ?? ['PUSH', 'EMAIL'];

  // ---- 3. Resolve channels ----
  const { channels, criticalOverride } = resolveChannels(prefs, category, ruleChannels);

  if (channels.length === 0) {
    notifLog.info('All channels opted out or unavailable — skipping', { category });
    await writeLog({
      userId,
      organizationId,
      templateKey,
      templateVersionId: 'unknown',
      channel: ruleChannels[0] ?? 'EMAIL',
      category,
      status: 'SKIPPED_USER_OPTOUT',
      criticalOverride: false,
      ruleId,
      ruleExecutionId,
    });
    return {
      userId,
      templateKey,
      results: [],
      escalated: false,
      skipped: true,
      skipReason: 'User opted out of all channels',
    };
  }

  // ---- 4. Rate limit check (FORM_REMINDER only) ----
  let escalated = false;
  if (category === 'FORM_REMINDER') {
    const rl = await checkAndIncrement(userId, templateKey, organizationId);
    if (!rl.shouldSend) {
      notifLog.info('Rate limit exceeded — skipping send', {
        count: rl.count,
        escalate: rl.escalate,
      });

      // Write escalation log
      await writeLog({
        userId,
        organizationId,
        templateKey,
        templateVersionId: 'unknown',
        channel: channels[0] ?? 'EMAIL',
        category,
        status: 'ESCALATED_INSTEAD_OF_SEND',
        criticalOverride: false,
        ruleId,
        ruleExecutionId,
        metadata: { missCount: rl.count },
      });

      // Trigger escalation to KP
      if (rl.escalate) {
        escalated = true;
        const { escalateToKp } = await import('./escalate');
        await escalateToKp(
          userId,
          user.fullName,
          templateKey,
          rl.count,
          organizationId,
          requestId,
        );
      }

      return {
        userId,
        templateKey,
        results: [],
        escalated,
        escalateReason: 'Rate limit exceeded',
        skipped: true,
        skipReason: `Rate limit exceeded (${rl.count} this week)`,
      };
    }
  }

  // ---- 5. Render template ----
  let rendered;
  try {
    rendered = await renderTemplate(templateKey, payload, organizationId);
  } catch (err) {
    notifLog.error('Template render failed', { error: err });
    await writeLog({
      userId,
      organizationId,
      templateKey,
      templateVersionId: 'unknown',
      channel: channels[0] ?? 'EMAIL',
      category,
      status: 'FAILED',
      criticalOverride,
      ruleId,
      ruleExecutionId,
      errorMessage: `Template render error: ${(err as Error).message}`,
    });
    return {
      userId,
      templateKey,
      results: [{ channel: channels[0] ?? 'EMAIL', status: 'FAILED', error: `Render error: ${(err as Error).message}` }],
      escalated: false,
      skipped: false,
    };
  }

  // ---- 6. Dispatch to channels ----
  const ctx: SendContext = {
    organizationId,
    requestId,
    ruleId,
    ruleExecutionId,
    category,
    criticalOverride,
    log: notifLog,
  };

  const results: SendNotificationResult['results'] = [];

  if (category === 'CRITICAL') {
    // CRITICAL: all channels in parallel
    const sendPromises = channels.map(async (channelType) => {
      const channel = await getChannel(channelType);
      if (!channel) return;

      const target = await buildTarget(userId, channelType);
      if (!target) {
        results.push({ channel: channelType, status: 'SKIPPED_NO_SUBSCRIPTION' });
        await writeLog({ userId, organizationId, templateKey, templateVersionId: rendered.templateVersionId, channel: channelType, category, status: 'SKIPPED_NO_SUBSCRIPTION', criticalOverride, ruleId, ruleExecutionId });
        return;
      }

      try {
        const result = await withRetry(() => channel.send(target, rendered, ctx), MAX_RETRIES, `push-critical-${channelType}`);
        results.push({ channel: channelType, status: result.status, providerMessageId: result.providerMessageId, error: result.error });
        await writeLog({ userId, organizationId, templateKey, templateVersionId: rendered.templateVersionId, channel: channelType, category, status: result.status, criticalOverride, ruleId, ruleExecutionId, providerMessageId: result.providerMessageId, errorMessage: result.error });
      } catch (err) {
        results.push({ channel: channelType, status: 'FAILED', error: (err as Error).message });
        await writeLog({ userId, organizationId, templateKey, templateVersionId: rendered.templateVersionId, channel: channelType, category, status: 'FAILED', criticalOverride, ruleId, ruleExecutionId, errorMessage: (err as Error).message, retryCount: MAX_RETRIES });
      }
    });

    await Promise.allSettled(sendPromises);
  } else {
    // NORMAL / FORM_REMINDER / OPS: sequential with fallback
    for (const channelType of channels) {
      const channel = await getChannel(channelType);
      if (!channel) continue;

      const target = await buildTarget(userId, channelType);
      if (!target) {
        results.push({ channel: channelType, status: 'SKIPPED_NO_SUBSCRIPTION' });
        await writeLog({ userId, organizationId, templateKey, templateVersionId: rendered.templateVersionId, channel: channelType, category, status: 'SKIPPED_NO_SUBSCRIPTION', criticalOverride, ruleId, ruleExecutionId });
        continue;
      }

      try {
        const result = await withRetry(() => channel.send(target, rendered, ctx), MAX_RETRIES, `send-${channelType}`);
        results.push({ channel: channelType, status: result.status, providerMessageId: result.providerMessageId, error: result.error });
        await writeLog({ userId, organizationId, templateKey, templateVersionId: rendered.templateVersionId, channel: channelType, category, status: result.status, criticalOverride, ruleId, ruleExecutionId, providerMessageId: result.providerMessageId, errorMessage: result.error });

        // If primary channel succeeded, stop (don't send on fallback channels)
        if (result.status === 'SENT' || result.status === 'PARTIAL') {
          notifLog.debug('Primary channel sent — skipping fallback channels', { channelType });
          break;
        }
      } catch (err) {
        results.push({ channel: channelType, status: 'FAILED', error: (err as Error).message });
        await writeLog({ userId, organizationId, templateKey, templateVersionId: rendered.templateVersionId, channel: channelType, category, status: 'FAILED', criticalOverride, ruleId, ruleExecutionId, errorMessage: (err as Error).message, retryCount: MAX_RETRIES });
        // Continue to next (fallback) channel
      }
    }
  }

  notifLog.info('sendNotification complete', {
    channelsAttempted: channels.length,
    results: results.map((r) => ({ channel: r.channel, status: r.status })),
    escalated,
  });

  return {
    userId,
    templateKey,
    results,
    escalated,
    skipped: false,
  };
}
