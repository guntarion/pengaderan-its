/**
 * /api/admin/pakta/versions
 * GET  — list pakta versions (dual-scope: DIGITAL global + ETIK per-org)
 * POST — publish a new pakta version
 *
 * GET query params:
 *   scope?: 'DIGITAL' | 'ETIK_PANITIA' | 'ETIK_PENGADER' | 'ALL'  (default: 'ALL')
 *   orgId?: string  (SUPERADMIN only — filter ETIK by specific org)
 *
 * POST Roles: SC, SUPERADMIN
 * POST Body:
 *   { type, title, contentMarkdown, quizQuestions, effectiveFrom, passingScore?,
 *     organizationId? }  ← organizationId for SUPERADMIN creating ETIK for a specific org
 *
 * Publish flow:
 *   1. Validate markdown + exactly 5 quiz questions
 *   2. Resolve target organizationId (NULL for DIGITAL; user's org or body param for ETIK)
 *   3. Mark current PUBLISHED version → SUPERSEDED
 *   4. Insert new version → PUBLISHED
 *   5. triggerResignForAllSigners (in same transaction)
 *   6. Write audit log
 *
 * Phase RV-D — M01 Revisi Multi-HMJ
 */

import { createApiHandler, ApiResponse, validateBody, validateQuery } from '@/lib/api';
import { BadRequestError, ForbiddenError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import { triggerResignForAllSigners } from '@/lib/pakta/versioning';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import type { PaktaType } from '@prisma/client';

// ---- Schemas ----

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
  /** SUPERADMIN only: override target org for ETIK types. Ignored for DIGITAL. */
  organizationId: z.string().optional(),
});

const listQuerySchema = z.object({
  /** Filter by pakta scope */
  scope: z.enum(['DIGITAL', 'ETIK_PANITIA', 'ETIK_PENGADER', 'ALL']).optional(),
  /** SUPERADMIN: filter ETIK by specific org ID */
  orgId: z.string().optional(),
});

// ---- GET — list versions (dual-scope) ----

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN', 'PEMBINA', 'BLM'],
  handler: async (req, { user, log }) => {
    const query = validateQuery(req, listQuerySchema);
    const scope = query.scope ?? 'ALL';
    const isSuperadmin = user.role === 'SUPERADMIN';
    const userOrgId = user.organizationId ?? '';

    log.info('Fetching pakta versions (dual-scope)', {
      role: user.role,
      scope,
      orgId: userOrgId,
      filterOrgId: query.orgId,
    });

    // Build where clause based on scope + role
    // DIGITAL: organizationId IS NULL (global)
    // ETIK: organizationId NOT NULL (per-org)
    // SC sees only their own org's ETIK; SUPERADMIN can filter or see all

    type WhereClause = {
      OR?: Array<Record<string, unknown>>;
      type?: PaktaType | { in: PaktaType[] };
      organizationId?: string | null | { not: null } | { in: string[] };
    };

    let where: WhereClause = {};

    const targetOrgId: string | undefined =
      isSuperadmin && query.orgId ? query.orgId : (!isSuperadmin ? userOrgId : undefined);

    if (scope === 'DIGITAL') {
      where = { type: 'SOCIAL_CONTRACT_MABA', organizationId: null };
    } else if (scope === 'ETIK_PANITIA') {
      where = {
        type: 'PAKTA_PANITIA',
        ...(targetOrgId !== undefined && { organizationId: targetOrgId }),
        ...(isSuperadmin && targetOrgId === undefined && { organizationId: { not: null } }),
      };
    } else if (scope === 'ETIK_PENGADER') {
      where = {
        type: 'PAKTA_PENGADER_2027',
        ...(targetOrgId !== undefined && { organizationId: targetOrgId }),
        ...(isSuperadmin && targetOrgId === undefined && { organizationId: { not: null } }),
      };
    } else {
      // ALL scope
      if (isSuperadmin) {
        // SUPERADMIN: DIGITAL (global) + ETIK for filter org (if provided) or all orgs
        where = targetOrgId
          ? {
              OR: [
                { type: 'SOCIAL_CONTRACT_MABA' as PaktaType, organizationId: null },
                {
                  type: { in: ['PAKTA_PANITIA', 'PAKTA_PENGADER_2027'] as PaktaType[] },
                  organizationId: targetOrgId,
                },
              ],
            }
          : {}; // no filter — see everything
      } else {
        // SC/PEMBINA/BLM: DIGITAL (global) + their own ETIK
        where = {
          OR: [
            { type: 'SOCIAL_CONTRACT_MABA' as PaktaType, organizationId: null },
            {
              type: { in: ['PAKTA_PANITIA', 'PAKTA_PENGADER_2027'] as PaktaType[] },
              organizationId: userOrgId,
            },
          ],
        };
      }
    }

    const versions = await prisma.paktaVersion.findMany({
      where,
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
        organizationId: true,
        organization: {
          select: { id: true, code: true, name: true },
        },
        _count: { select: { signatures: true } },
      },
    });

    return ApiResponse.success(versions);
  },
});

// ---- POST — publish new version ----

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, publishSchema);
    const isSuperadmin = user.role === 'SUPERADMIN';
    const userOrgId = user.organizationId ?? '';

    const { type, title, contentMarkdown, quizQuestions, effectiveFrom, passingScore } = body;

    // Resolve target organizationId
    // DIGITAL (SOCIAL_CONTRACT_MABA) → always NULL (global)
    // ETIK → SC uses own org; SUPERADMIN can specify via body.organizationId
    let targetOrgId: string | null;
    if (type === 'SOCIAL_CONTRACT_MABA') {
      // DIGITAL: global — only SUPERADMIN can publish
      if (!isSuperadmin) {
        throw ForbiddenError('Hanya SUPERADMIN yang dapat menerbitkan Pakta DIGITAL institusi-wide');
      }
      targetOrgId = null;
    } else {
      // ETIK
      if (isSuperadmin && body.organizationId) {
        targetOrgId = body.organizationId;
      } else {
        if (!userOrgId) throw BadRequestError('organizationId tidak ditemukan di sesi');
        targetOrgId = userOrgId;
      }
    }

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

    log.info('Publishing new pakta version', { targetOrgId, type, title });

    // Get current max versionNumber for this type+org
    const latestVersion = await prisma.paktaVersion.findFirst({
      where: { organizationId: targetOrgId, type: type as PaktaType },
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
          organizationId: targetOrgId,
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
      organizationId: targetOrgId ?? undefined,
      actorUserId: user.id,
      entityType: 'PaktaVersion',
      entityId: type,
      metadata: {
        type,
        versionNumber: newVersionNumber,
        title,
        resignedCount,
        targetOrgId,
        scope: type === 'SOCIAL_CONTRACT_MABA' ? 'DIGITAL_GLOBAL' : `ETIK_ORG:${targetOrgId}`,
      },
    });

    log.info('Pakta version published', {
      type,
      versionNumber: newVersionNumber,
      resignedCount,
      targetOrgId,
    });

    return ApiResponse.success(
      {
        published: true,
        type,
        versionNumber: newVersionNumber,
        title,
        resignedCount,
        organizationId: targetOrgId,
      },
      201
    );
  },
});
