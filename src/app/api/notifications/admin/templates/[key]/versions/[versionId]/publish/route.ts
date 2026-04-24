/**
 * src/app/api/notifications/admin/templates/[key]/versions/[versionId]/publish/route.ts
 * NAWASENA M15 — Publish a template version (set as activeVersion)
 *
 * POST /api/notifications/admin/templates/[key]/versions/[versionId]/publish
 * Roles: SC, SUPERADMIN
 *
 * Sets the version as the active version for the template.
 * Requires dry-run check: validates content has required fields for each channel.
 * Records audit log NOTIFICATION_TEMPLATE_PUBLISH.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, NotFoundError, BadRequestError } from '@/lib/api';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { key, versionId } = ctx.params as { key: string; versionId: string };

    ctx.log.info('Publishing template version', { templateKey: key, versionId });

    // Find version
    const version = await prisma.notificationTemplateVersion.findUnique({
      where: { id: versionId },
      include: {
        template: { select: { id: true, templateKey: true, organizationId: true, supportedChannels: true } },
      },
    });

    if (!version || version.template.templateKey !== key) {
      throw NotFoundError(`Template version '${versionId}'`);
    }

    // Dry-run validation: check content has fields for each supported channel
    const content = version.content as Record<string, Record<string, string>>;
    const channels = version.template.supportedChannels;
    const validationErrors: string[] = [];

    if (channels.includes('PUSH')) {
      if (!content.push?.title || !content.push?.body) {
        validationErrors.push('PUSH channel requires push.title and push.body');
      }
    }
    if (channels.includes('EMAIL')) {
      if (!content.email?.subject) {
        validationErrors.push('EMAIL channel requires email.subject');
      }
    }

    if (validationErrors.length > 0) {
      throw BadRequestError(`Template validation failed: ${validationErrors.join(', ')}`);
    }

    // Set as active version and record publishedAt
    await prisma.$transaction([
      prisma.notificationTemplateVersion.update({
        where: { id: versionId },
        data: { publishedAt: new Date() },
      }),
      prisma.notificationTemplate.update({
        where: { id: version.template.id },
        data: { activeVersionId: versionId },
      }),
    ]);

    await auditLog.fromContext(
      ctx,
      {
        action: AUDIT_ACTIONS.NOTIFICATION_TEMPLATE_PUBLISH,
        resource: 'notification_template_version',
        resourceId: versionId,
        newValue: { templateKey: key, version: version.version },
      },
      req,
    );

    ctx.log.info('Template version published', { templateKey: key, versionId });

    return ApiResponse.success({
      published: true,
      versionId,
      templateKey: key,
      version: version.version,
    });
  },
});
