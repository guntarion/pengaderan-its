/**
 * src/app/api/notifications/admin/templates/[key]/versions/route.ts
 * NAWASENA M15 — Create a new template version (append-only)
 *
 * POST /api/notifications/admin/templates/[key]/versions
 * Roles: SC, SUPERADMIN
 *
 * Creates a new version for a template (global or org-specific).
 * Does NOT publish it automatically — use the /publish endpoint.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, NotFoundError } from '@/lib/api';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const createVersionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver format (e.g. 1.2.0)'),
  format: z.enum(['PLAIN', 'MARKDOWN', 'REACT_EMAIL']),
  content: z.object({
    push: z.object({
      title: z.string().optional(),
      body: z.string().optional(),
    }).optional(),
    email: z.object({
      subject: z.string().optional(),
      reactComponent: z.string().optional(),
    }).optional(),
    whatsapp: z.object({
      body: z.string().optional(),
    }).optional(),
  }),
});

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { key } = ctx.params as { key: string };
    const body = await validateBody(req, createVersionSchema);

    ctx.log.info('Creating new template version', { templateKey: key, version: body.version });

    // Find template — prefer org-specific, fallback global
    const template = await prisma.notificationTemplate.findFirst({
      where: {
        templateKey: key,
        OR: [
          { organizationId: ctx.user!.organizationId },
          { organizationId: null },
        ],
      },
      select: { id: true, organizationId: true },
    });

    if (!template) throw NotFoundError(`Template with key '${key}'`);

    // Check version uniqueness
    const existing = await prisma.notificationTemplateVersion.findFirst({
      where: { templateId: template.id, version: body.version },
    });

    if (existing) {
      return ApiResponse.success({ error: 'Version already exists', existingId: existing.id }, 409);
    }

    const version = await prisma.notificationTemplateVersion.create({
      data: {
        templateId: template.id,
        version: body.version,
        format: body.format,
        content: body.content as unknown as Prisma.InputJsonValue,
        createdById: ctx.user!.id,
      },
      select: {
        id: true,
        version: true,
        format: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    ctx.log.info('Template version created', {
      templateKey: key,
      versionId: version.id,
      version: version.version,
    });

    return ApiResponse.success(version, 201);
  },
});
