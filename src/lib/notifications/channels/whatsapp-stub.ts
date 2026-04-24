/**
 * src/lib/notifications/channels/whatsapp-stub.ts
 * NAWASENA M15 — WhatsApp channel stub (Phase 2 — not yet implemented).
 *
 * Returns NOT_IMPLEMENTED for all send attempts.
 * Allows the system to reference WhatsApp as a channel without failing.
 */

import type {
  NotificationChannel,
  ChannelTarget,
  ChannelResult,
  RenderedTemplate,
  SendContext,
  UserPreferences,
} from '../types';
import type { ChannelType } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('notifications:whatsapp-stub');

export class WhatsAppStubChannel implements NotificationChannel {
  readonly type: ChannelType = 'WHATSAPP';

  async isAvailable(_userId: string, prefs: UserPreferences): Promise<boolean> {
    // Always unavailable in V1 stub
    if (!prefs.whatsappEnabled) return false;
    return false;
  }

  async send(
    target: ChannelTarget,
    _rendered: RenderedTemplate,
    ctx: SendContext,
  ): Promise<ChannelResult> {
    log.info('WhatsApp channel stub — not implemented in V1', {
      userId: target.userId,
      templateKey: _rendered.templateKey,
      category: ctx.category,
    });

    return {
      status: 'NOT_IMPLEMENTED',
      error: 'WhatsApp channel not available in V1 — Phase 2 planned',
    };
  }
}
