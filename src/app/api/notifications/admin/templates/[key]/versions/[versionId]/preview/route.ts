/**
 * src/app/api/notifications/admin/templates/[key]/versions/[versionId]/preview/route.ts
 * NAWASENA M15 — Render a template version with sample payload
 *
 * POST /api/notifications/admin/templates/[key]/versions/[versionId]/preview
 * Roles: SC, SUPERADMIN
 *
 * Returns the rendered push title/body + email subject with sample variable substitution.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, NotFoundError } from '@/lib/api';
import { z } from 'zod';

const previewSchema = z.object({
  samplePayload: z.record(z.string()).optional(),
});

function substituteVariables(template: string, payload: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return payload[key] ?? `{{${key}}}`;
  });
}

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { key, versionId } = ctx.params as { key: string; versionId: string };
    const { samplePayload = {} } = await validateBody(req, previewSchema);

    const version = await prisma.notificationTemplateVersion.findUnique({
      where: { id: versionId },
      include: {
        template: { select: { templateKey: true } },
      },
    });

    if (!version || version.template.templateKey !== key) {
      throw NotFoundError(`Template version '${versionId}'`);
    }

    const content = version.content as Record<string, Record<string, string>>;

    const preview: Record<string, Record<string, string>> = {};

    if (content.push) {
      preview.push = {
        title: substituteVariables(content.push.title ?? '', samplePayload),
        body: substituteVariables(content.push.body ?? '', samplePayload),
      };
    }

    if (content.email) {
      preview.email = {
        subject: substituteVariables(content.email.subject ?? '', samplePayload),
        reactComponent: content.email.reactComponent ?? '',
      };
    }

    if (content.whatsapp) {
      preview.whatsapp = {
        body: substituteVariables(content.whatsapp.body ?? '', samplePayload),
      };
    }

    ctx.log.debug('Template preview rendered', { templateKey: key, versionId });

    return ApiResponse.success({
      templateKey: key,
      version: version.version,
      format: version.format,
      preview,
    });
  },
});
