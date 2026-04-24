/**
 * src/lib/notifications/channels/email.ts
 * NAWASENA M15 — Email channel using Resend + React Email.
 *
 * Requires: RESEND_API_KEY
 */

import type {
  NotificationChannel,
  ChannelTarget,
  ChannelResult,
  RenderedTemplate,
  SendContext,
  UserPreferences,
  EmailTarget,
} from '../types';
import type { ChannelType } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import { prisma } from '@/utils/prisma';

const log = createLogger('notifications:email-channel');

const BOUNCE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let resend: import('resend').Resend | null = null;

function getResend(): import('resend').Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    // Dynamic require to allow usage without the package during testing
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resend } = require('resend') as typeof import('resend');
    resend = new Resend(apiKey);
  }
  return resend;
}

async function renderEmailHtml(
  reactComponent: string,
  payload: Record<string, unknown>,
  fallbackHtml?: string,
): Promise<string> {
  try {
    // Dynamic import of React Email component by path
    // The reactComponent is a module path like 'src/emails/MabaPulseDaily'
    const emailModule = await import(`@/${reactComponent.replace('src/', '')}`);
    const Component = emailModule.default ?? emailModule[Object.keys(emailModule)[0]];

    if (!Component) {
      throw new Error(`No default export found in ${reactComponent}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { render } = require('@react-email/render') as typeof import('@react-email/render');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react') as typeof import('react');

    const html = await render(React.createElement(Component, payload));
    return html;
  } catch (err) {
    log.warn('React Email component render failed, using fallback', {
      component: reactComponent,
      error: err,
    });

    if (fallbackHtml) {
      // Simple mustache substitution on fallback HTML
      return substitutePlaceholders(fallbackHtml, payload);
    }

    throw err;
  }
}

function substitutePlaceholders(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return payload[key] !== undefined ? String(payload[key]) : `{{${key}}}`;
  });
}

export class EmailChannel implements NotificationChannel {
  readonly type: ChannelType = 'EMAIL';

  async isAvailable(userId: string, prefs: UserPreferences): Promise<boolean> {
    if (!prefs.emailEnabled) return false;

    // Check bounce cooldown
    if (prefs.emailBouncedAt) {
      const cooldownExpiry = prefs.emailBouncedAt.getTime() + BOUNCE_COOLDOWN_MS;
      if (Date.now() < cooldownExpiry) {
        return false;
      }
    }

    return true;
  }

  async send(
    target: ChannelTarget,
    rendered: RenderedTemplate,
    ctx: SendContext,
  ): Promise<ChannelResult> {
    if (target.type !== 'EMAIL') {
      return {
        status: 'FAILED',
        error: `Invalid target type ${target.type} for EmailChannel`,
      };
    }

    const emailTarget = target as EmailTarget;

    if (!rendered.email) {
      return {
        status: 'FAILED',
        error: 'No email content in rendered template',
      };
    }

    // Bounce cooldown check (double-check at send time)
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: emailTarget.userId },
      select: { emailBouncedAt: true, emailEnabled: true },
    });

    if (prefs?.emailBouncedAt) {
      const cooldownExpiry = prefs.emailBouncedAt.getTime() + BOUNCE_COOLDOWN_MS;
      if (Date.now() < cooldownExpiry) {
        ctx.log.info('Email skipped — bounce cooldown active', {
          userId: emailTarget.userId,
          bouncedAt: prefs.emailBouncedAt,
        });
        return {
          status: 'SKIPPED_BOUNCE_COOLDOWN',
          skippedReason: 'Email bounced within 30-day cooldown window',
        };
      }
    }

    // Render email HTML
    let html: string;
    try {
      html = await renderEmailHtml(
        rendered.email.reactComponent,
        {
          ...rendered.email.payload,
          unsubscribeToken: emailTarget.unsubscribeToken,
          userName: emailTarget.name,
        },
        rendered.email.fallbackHtml,
      );
    } catch (err) {
      ctx.log.error('Email render failed completely', {
        userId: emailTarget.userId,
        component: rendered.email.reactComponent,
        error: err,
      });
      return {
        status: 'FAILED',
        error: `Email render error: ${(err as Error).message}`,
      };
    }

    const subject = substitutePlaceholders(rendered.email.subject, rendered.email.payload);
    const fromEmail = process.env.EMAIL_FROM ?? 'nawasena@its.ac.id';

    try {
      const client = getResend();
      const response = await client.emails.send({
        from: fromEmail,
        to: emailTarget.email,
        subject,
        html,
        tags: [
          { name: 'templateKey', value: rendered.templateKey },
          { name: 'category', value: ctx.category },
        ],
      });

      if (response.error) {
        ctx.log.error('Resend API error', {
          userId: emailTarget.userId,
          error: response.error,
        });
        return {
          status: 'FAILED',
          error: `Resend API error: ${response.error.message}`,
        };
      }

      ctx.log.info('Email sent successfully', {
        userId: emailTarget.userId,
        to: emailTarget.email,
        subject,
        messageId: response.data?.id,
      });

      return {
        status: 'SENT',
        providerMessageId: response.data?.id,
      };
    } catch (err) {
      ctx.log.error('Email send failed', {
        userId: emailTarget.userId,
        error: err,
      });
      return {
        status: 'FAILED',
        error: `Email send error: ${(err as Error).message}`,
      };
    }
  }
}
