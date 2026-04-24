/**
 * src/lib/notifications/types.ts
 * NAWASENA M15 — Notification system core types and interfaces.
 */

import type { ChannelType, NotificationCategory } from '@prisma/client';

// ============================================================
// Channel Target — who/where to send
// ============================================================

export interface PushTarget {
  type: 'PUSH';
  userId: string;
  subscriptions: Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>;
}

export interface EmailTarget {
  type: 'EMAIL';
  userId: string;
  email: string;
  name: string;
  unsubscribeToken: string;
}

export interface WhatsAppTarget {
  type: 'WHATSAPP';
  userId: string;
  phoneNumber: string;
}

export type ChannelTarget = PushTarget | EmailTarget | WhatsAppTarget;

// ============================================================
// Rendered Template — output from render-template.ts
// ============================================================

export interface RenderedPush {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

export interface RenderedEmail {
  subject: string;
  /** Path to React Email component (relative to project root) */
  reactComponent: string;
  /** Fallback HTML if component can't be rendered */
  fallbackHtml?: string;
  /** Payload props passed to the React component */
  payload: Record<string, unknown>;
}

export interface RenderedWhatsApp {
  body: string;
}

export interface RenderedTemplate {
  templateKey: string;
  templateVersionId: string;
  push?: RenderedPush;
  email?: RenderedEmail;
  whatsapp?: RenderedWhatsApp;
}

// ============================================================
// Channel Result — output from channel.send()
// ============================================================

export type ChannelStatus =
  | 'SENT'
  | 'FAILED'
  | 'SKIPPED_NO_SUBSCRIPTION'
  | 'SKIPPED_BOUNCE_COOLDOWN'
  | 'NOT_IMPLEMENTED'
  | 'PARTIAL'; // some subscriptions sent, some failed

export interface ChannelResultSubscription {
  subscriptionId: string;
  status: 'SENT' | 'FAILED' | 'EXPIRED';
  providerMessageId?: string;
  error?: string;
}

export interface ChannelResult {
  status: ChannelStatus;
  providerMessageId?: string; // for email — Resend message ID
  subscriptions?: ChannelResultSubscription[]; // for push — per-device
  error?: string;
  skippedReason?: string;
}

// ============================================================
// Send Context — metadata passed to channel.send()
// ============================================================

export interface SendContext {
  organizationId: string;
  requestId?: string;
  ruleId?: string;
  ruleExecutionId?: string;
  category: NotificationCategory;
  criticalOverride: boolean;
  log: ReturnType<typeof import('../logger').createLogger>;
}

// ============================================================
// NotificationChannel — interface all channels must implement
// ============================================================

export interface NotificationChannel {
  readonly type: ChannelType;

  /**
   * Check if this channel is available for the given user + preferences.
   * For push: checks if user has active subscriptions.
   * For email: checks if email not bounced + emailEnabled preference.
   */
  isAvailable(userId: string, prefs: UserPreferences): Promise<boolean>;

  /**
   * Send notification to target via this channel.
   * Never throws — returns ChannelResult with status.
   */
  send(
    target: ChannelTarget,
    rendered: RenderedTemplate,
    ctx: SendContext,
  ): Promise<ChannelResult>;
}

// ============================================================
// User Preferences — subset needed by resolver + channels
// ============================================================

export interface UserPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  emailBouncedAt: Date | null;
  unsubscribeToken: string;
}

// ============================================================
// sendNotification params
// ============================================================

export interface SendNotificationParams {
  userId: string;
  templateKey: string;
  /** Payload data matched against template payloadSchema */
  payload: Record<string, unknown>;
  category: NotificationCategory;
  ruleId?: string;
  ruleExecutionId?: string;
  requestId?: string;
}

export interface SendNotificationResult {
  userId: string;
  templateKey: string;
  results: Array<{
    channel: ChannelType;
    status: ChannelStatus;
    providerMessageId?: string;
    error?: string;
  }>;
  escalated: boolean;
  escalateReason?: string;
  skipped: boolean;
  skipReason?: string;
}
