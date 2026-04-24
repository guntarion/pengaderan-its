/**
 * src/lib/notifications/render-template.ts
 * NAWASENA M15 — Fetch active template version and render it with payload.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import type { RenderedTemplate } from './types';

const log = createLogger('notifications:render-template');

interface TemplateContent {
  push?: { title: string; body: string; icon?: string; url?: string };
  email?: {
    subject: string;
    reactComponent: string;
    fallbackHtml?: string;
  };
  whatsapp?: { body: string };
}

/**
 * Substitute {{variable}} placeholders in a string with payload values.
 */
function substitute(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = payload[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

/**
 * Fetch the active template version for the given templateKey and render it.
 * For per-org customization, org-specific templates take precedence over global.
 *
 * @param templateKey - Template identifier (e.g., 'MABA_PULSE_DAILY')
 * @param payload - Variable substitution payload
 * @param organizationId - Current org for per-org override lookup
 */
export async function renderTemplate(
  templateKey: string,
  payload: Record<string, unknown>,
  organizationId: string,
): Promise<RenderedTemplate> {
  // Try org-specific template first, fall back to global
  let template = await prisma.notificationTemplate.findFirst({
    where: { templateKey, organizationId },
    include: {
      activeVersion: true,
    },
  });

  if (!template || !template.activeVersion) {
    // Fall back to global template (organizationId null)
    template = await prisma.notificationTemplate.findFirst({
      where: { templateKey, organizationId: null },
      include: {
        activeVersion: true,
      },
    });
  }

  if (!template) {
    throw new Error(`Template not found for key: ${templateKey}`);
  }

  if (!template.activeVersion) {
    throw new Error(`Template ${templateKey} has no active version`);
  }

  const version = template.activeVersion;
  const content = version.content as TemplateContent;

  const rendered: RenderedTemplate = {
    templateKey,
    templateVersionId: version.id,
  };

  // Render push content
  if (content.push) {
    rendered.push = {
      title: substitute(content.push.title, payload),
      body: substitute(content.push.body, payload),
      icon: content.push.icon,
      url: typeof payload.url === 'string' ? payload.url : undefined,
    };
  }

  // Render email content (subject substituted; component path + payload for React Email)
  if (content.email) {
    rendered.email = {
      subject: substitute(content.email.subject, payload),
      reactComponent: content.email.reactComponent,
      fallbackHtml: content.email.fallbackHtml
        ? substitute(content.email.fallbackHtml, payload)
        : undefined,
      payload,
    };
  }

  // Render whatsapp content
  if (content.whatsapp) {
    rendered.whatsapp = {
      body: substitute(content.whatsapp.body, payload),
    };
  }

  log.debug('Template rendered', {
    templateKey,
    templateVersionId: version.id,
    version: version.version,
    channels: Object.keys(rendered).filter((k) => k !== 'templateKey' && k !== 'templateVersionId'),
  });

  return rendered;
}
