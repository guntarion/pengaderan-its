/**
 * src/lib/notifications/channels/registry.ts
 * NAWASENA M15 — Channel registry. Maps ChannelType to implementation.
 */

import type { NotificationChannel } from '../types';
import type { ChannelType } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('notifications:channel-registry');

// Lazy-loaded channel instances (avoid initialization errors if env vars missing)
let channelMap: Map<ChannelType, NotificationChannel> | null = null;

async function getChannelMap(): Promise<Map<ChannelType, NotificationChannel>> {
  if (channelMap) return channelMap;

  const { PushChannel } = await import('./push');
  const { EmailChannel } = await import('./email');
  const { WhatsAppStubChannel } = await import('./whatsapp-stub');

  channelMap = new Map<ChannelType, NotificationChannel>([
    ['PUSH', new PushChannel()],
    ['EMAIL', new EmailChannel()],
    ['WHATSAPP', new WhatsAppStubChannel()],
  ]);

  log.debug('Channel registry initialized', {
    channels: Array.from(channelMap.keys()),
  });

  return channelMap;
}

/**
 * Get the channel implementation for a given ChannelType.
 * Returns null if channel type is not registered (e.g., IN_APP reserved for future).
 */
export async function getChannel(type: ChannelType): Promise<NotificationChannel | null> {
  const map = await getChannelMap();
  const channel = map.get(type) ?? null;

  if (!channel) {
    log.warn('Channel not found in registry', { channelType: type });
  }

  return channel;
}

/**
 * Get all registered channel types.
 */
export function getSupportedChannelTypes(): ChannelType[] {
  return ['PUSH', 'EMAIL', 'WHATSAPP'];
}
