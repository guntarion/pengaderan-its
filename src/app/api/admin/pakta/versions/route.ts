/**
 * /api/admin/pakta/versions
 * GET  — list pakta versions for the current org
 * POST — publish a new pakta version
 *
 * POST Roles: SC, SUPERADMIN
 *
 * POST Body:
 *   { type, title, contentMarkdown, quizQuestions, effectiveFrom, passingScore? }
 *
 * Publish flow:
 *   1. Validate markdown + exactly 5 quiz questions
 *   2. Mark current PUBLISHED version → SUPERSEDED
 *   3. Insert new version → PUBLISHED
 *   4. triggerResignForAllSigners (in same transaction)
 *   5. Write audit log
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { BadRequestError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import { triggerResignForAllSigners } from '@/lib/pakta/versioning';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import type { PaktaType } from '@prisma/client';

// Quiz question schema
const quizOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1, 'Teks opsi tidak boleh kosong'),
});

const quizQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(10, 'Pertanyaan minimal 10 karakter'),
  options: z.array(quizOptionSchema).min(2, 'Minimal 2 opsi'),
  correctAnswerIds: z.array(z.string()).min(1, 'Minimal 1 jawaban benar'),
});

const publishSchema = z.object({
  type: z.enum(['PAKTA_PANITIA', 'SOCIAL_CONTRACT_MABA', 'PAKTA_PENGADER_2027']),
  title: z.string().min(5, 'Judul minimal 5 karakter'),
  contentMarkdown: z.string().min(100, 'Konten minimal 100 karakter'),
  quizQuestions: z
    .array(quizQuestionSchema)
    .length(5, 'Harus ada tepat 5 pertanyaan quiz'),
  effectiveFrom: z.string().datetime(),
  passingScore: z.number().int().min(50).max(100).default(80),
});

// GET — list versions for org
export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN', 'PEMBINA', 'BLM'],
  handler: async (_req, { user, log }) => {
    const orgId = user.organizationId ?? '';
    if (!orgId) throw BadRequestError('organizationId tidak ditemukan di sesi');

    log.info('Fetching pakta versions', { orgId });

    const versions = await prisma.paktaVersion.findMany({
      where: { organizationId: orgId },
      orderBy: [{ type: 'asc' }, { versionNumber: 'desc' }],
      select: {
        id: true,
        type: true,
        versionNumber: true,
        title: true,
        status: true,
        passingScore: true,
        publishedAt: true,
        effectiveFrom: true,
        effectiveUntil: true,
        createdAt: true,
        _count: { select: { signatures: true } },
      },
    });

    return ApiResponse.success(versions);
  },
});

// POST — publish new version
export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, publishSchema);
    const orgId = user.organizationId ?? '';
    if (!orgId) throw BadRequestError('organizationId tidak ditemukan di sesi');

    const { type, title, contentMarkdown, quizQuestions, effectiveFrom, passingScore } = body;

    // Validate all correctAnswerIds reference existing option IDs
    for (const q of quizQuestions) {
      const optionIds = new Set(q.options.map((o) => o.id));
      for (const answerId of q.correctAnswerIds) {
        if (!optionIds.has(answerId)) {
          throw BadRequestError(
            `ID jawaban benar "${answerId}" tidak ditemukan di opsi pertanyaan "${q.id}"`
          );
        }
      }
    }

    log.info('Publishing new pakta version', { orgId, type, title });

    // Get current max versionNumber for this type+org
    const latestVersion = await prisma.paktaVersion.findFirst({
      where: { organizationId: orgId, type: type as PaktaType },
      orderBy: { versionNumber: 'desc' },
      select: { id: true, versionNumber: true, status: true },
    });

    const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;
    const now = new Date();

    let resignedCount = 0;

    await prisma.$transaction(async (tx) => {
      // Mark existing PUBLISHED version as SUPERSEDED
      if (latestVersion?.status === 'PUBLISHED') {
        await tx.paktaVersion.update({
          where: { id: latestVersion.id },
          data: {
            status: 'SUPERSEDED',
            supersededAt: now,
          },
        });
      }

      // Create new PUBLISHED version
      const newVersion = await tx.paktaVersion.create({
        data: {
          organizationId: orgId,
          type: type as PaktaType,
          versionNumber: newVersionNumber,
          title,
          contentMarkdown,
          quizQuestions: { questions: quizQuestions },
          passingScore,
          effectiveFrom: new Date(effectiveFrom),
          status: 'PUBLISHED',
          publishedAt: now,
          publishedBy: user.id,
          ...(latestVersion && {
            supersedes: { connect: { id: latestVersion.id } },
          }),
        },
      });

      // Update old version to point to new one
      if (latestVersion?.status === 'PUBLISHED') {
        await tx.paktaVersion.update({
          where: { id: latestVersion.id },
          data: { supersededByVersionId: newVersion.id },
        });

        // Trigger re-sign for existing signers
        resignedCount = await triggerResignForAllSigners(
          latestVersion.id,
          newVersion.id,
          type as PaktaType,
          tx
        );
      }
    });

    // Write audit log (outside transaction — best effort)
    await logAudit({
      action: AuditAction.PAKTA_VERSION_PUBLISH,
      organizationId: orgId,
      actorUserId: user.id,
      entityType: 'PaktaVersion',
      entityId: type,
      metadata: {
        type,
        versionNumber: newVersionNumber,
        title,
        resignedCount,
      },
    });

    log.info('Pakta version published', {
      type,
      versionNumber: newVersionNumber,
      resignedCount,
    });

    return ApiResponse.success(
      {
        published: true,
        type,
        versionNumber: newVersionNumber,
        title,
        resignedCount,
      },
      201
    );
  },
});
