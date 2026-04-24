/**
 * src/lib/notifications/resolve-preferences.ts
 * NAWASENA M15 — Resolve which channels to use based on user preferences + category.
 *
 * CRITICAL override: PUSH + EMAIL always sent regardless of user opt-out.
 */

import type { ChannelType, NotificationCategory } from '@prisma/client';
import type { UserPreferences } from './types';
import { createLogger } from '@/lib/logger';

const log = createLogger('notifications:resolve-preferences');

/**
 * Resolve the list of channels to send to, based on:
 * 1. Rule's configured channels
 * 2. User's preferences per channel
 * 3. Category override (CRITICAL always sends push + email)
 *
 * @param prefs - User's notification preferences
 * @param category - Notification category
 * @param ruleChannels - Channels configured on the rule/template
 * @returns Array of ChannelType to send to
 */
export function resolveChannels(
  prefs: UserPreferences,
  category: NotificationCategory,
  ruleChannels: ChannelType[],
): { channels: ChannelType[]; criticalOverride: boolean } {
  // CRITICAL category: always send PUSH + EMAIL regardless of opt-out
  if (category === 'CRITICAL') {
    const criticalChannels = ruleChannels.filter(
      (ch) => ch === 'PUSH' || ch === 'EMAIL',
    );

    if (criticalChannels.length > 0) {
      log.debug('CRITICAL category — overriding user preferences', {
        channels: criticalChannels,
      });
      return { channels: criticalChannels, criticalOverride: true };
    }

    // Fallback: include both if rule doesn't specify
    return { channels: ['PUSH', 'EMAIL'], criticalOverride: true };
  }

  // Non-CRITICAL: filter by user preferences
  const resolvedChannels: ChannelType[] = [];

  for (const channel of ruleChannels) {
    switch (channel) {
      case 'PUSH':
        if (prefs.pushEnabled) resolvedChannels.push('PUSH');
        break;
      case 'EMAIL':
        if (prefs.emailEnabled) {
          // Bounce cooldown check: if bounced within 30 days, skip email
          if (prefs.emailBouncedAt) {
            const cooldownMs = 30 * 24 * 60 * 60 * 1000;
            const cooldownExpiry = prefs.emailBouncedAt.getTime() + cooldownMs;
            if (Date.now() < cooldownExpiry) {
              log.debug('Email skipped — bounce cooldown active', {
                bouncedAt: prefs.emailBouncedAt,
              });
              break;
            }
          }
          resolvedChannels.push('EMAIL');
        }
        break;
      case 'WHATSAPP':
        if (prefs.whatsappEnabled) resolvedChannels.push('WHATSAPP');
        break;
      case 'IN_APP':
        // IN_APP reserved for future — skip for now
        break;
    }
  }

  log.debug('Resolved channels for non-CRITICAL category', {
    category,
    requested: ruleChannels,
    resolved: resolvedChannels,
  });

  return { channels: resolvedChannels, criticalOverride: false };
}
