/**
 * src/app/api/mental-health/submissions/route.ts
 * NAWASENA M11 — MH Screening Submission API
 *
 * POST /api/mental-health/submissions
 *   Role: authenticated (MABA)
 *   Validates consent, scores PHQ-9, encrypts rawScore + answers, stores in DB.
 *   Triggers createReferralForRED when severity=RED.
 *   Audit log: MH_SCREENING_SUBMITTED.
 *   Returns: MHSubmissionResult (severity, flagged, immediateContact, interpretationKey)
 *   NEVER returns raw scores or individual answers.
 *
 * GET /api/mental-health/submissions
 *   Role: authenticated (own screenings only)
 *   Returns list of own screening metadata (no scores, no answers).
 *
 * PRIVACY-CRITICAL:
 *   - All DB writes use withMHContext (sets RLS session vars + encryption key).
 *   - rawScoreEncrypted: pgcrypto pgp_sym_encrypt of JSON score object.
 *   - answerValueEncrypted: pgcrypto of each answer value (0-3).
 *   - Response NEVER includes rawScore or individual answers.
 */

import { createApiHandler, ApiResponse, validateBody, BadRequestError } from '@/lib/api';
import { PHQ9SubmissionSchema } from '@/lib/mh-screening/types';
import { withMHContext } from '@/lib/mh-screening/rls-helpers';
import { recordMHAccess } from '@/lib/mh-screening/access-log';
import { createReferralForRED } from '@/lib/mh-screening/referral';
import { scoreInstrument } from '@/lib/mh-scoring';

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, PHQ9SubmissionSchema);

    log.info('MH submission POST', {
      userId: user.id,
      cohortId: body.cohortId,
      phase: body.phase,
      instrument: 'PHQ9',
    });

    const result = await withMHContext({ id: user.id }, async (tx) => {
      // 1. Verify consent is active
      const consent = await tx.mHConsentRecord.findUnique({
        where: { id: body.consentId },
      });

      if (!consent || consent.userId !== user.id || consent.status !== 'GRANTED') {
        throw BadRequestError('Persetujuan tidak valid atau sudah dicabut');
      }

      // 2. Check for duplicate submission
      const duplicate = await tx.mHScreening.findUnique({
        where: {
          userId_cohortId_phase_instrument: {
            userId: user.id,
            cohortId: body.cohortId,
            phase: body.phase,
            instrument: 'PHQ9',
          },
        },
      });

      if (duplicate) {
        throw BadRequestError('Skrining untuk fase ini sudah ada');
      }

      // 3. Get user's organization for referral
      const userRecord = await tx.user.findUnique({
        where: { id: user.id },
        select: { organizationId: true, kpGroupMembers: {
          where: { cohortId: body.cohortId, status: 'ACTIVE' },
          select: { kpGroupId: true },
          take: 1,
        }},
      });

      if (!userRecord?.organizationId) {
        throw BadRequestError('Data organisasi pengguna tidak ditemukan');
      }

      // 4. Score PHQ-9 (pure function, no DB)
      const scoring = scoreInstrument('PHQ9', body.answers);

      // 5. Insert encrypted screening record using pgcrypto
      // rawScoreEncrypted: encrypt the full scoring result as JSON
      const scoreJson = JSON.stringify({
        totalScore: scoring.totalScore,
        interpretationKey: scoring.interpretationKey,
      });

      // Use $executeRaw for encrypted insert with pgcrypto
      // Prisma doesn't support pgcrypto natively — we use raw SQL then fetch back by unique constraint
      await tx.$executeRaw`
        INSERT INTO "mh_screenings" (
          id, "userId", "cohortId", "organizationId", "kpGroupId",
          instrument, phase,
          "rawScoreEncrypted",
          severity, flagged, "immediateContact",
          "encryptionKeyVersion", "consentId",
          "recordedAt", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid()::text,
          ${user.id}, ${body.cohortId},
          ${userRecord.organizationId},
          ${userRecord.kpGroupMembers[0]?.kpGroupId ?? null},
          'PHQ9', ${body.phase}::text,
          pgp_sym_encrypt(${scoreJson}::text, current_setting('app.mh_encryption_key')),
          ${scoring.severity}::text::"MHSeverity",
          ${scoring.flagged}, ${scoring.immediateContact},
          1, ${body.consentId},
          NOW(), NOW(), NOW()
        )
      `;

      // Fetch the newly created record by unique constraint to get its ID
      const screening = await tx.mHScreening.findUnique({
        where: {
          userId_cohortId_phase_instrument: {
            userId: user.id,
            cohortId: body.cohortId,
            phase: body.phase,
            instrument: 'PHQ9',
          },
        },
      });

      if (!screening) {
        throw new Error('Failed to retrieve screening after insert');
      }

      // 6. Insert encrypted answers
      for (let i = 0; i < body.answers.length; i++) {
        const answerValue = String(body.answers[i]);
        await tx.$executeRaw`
          INSERT INTO "mh_screening_answers" (
            id, "screeningId", "questionIndex",
            "answerValueEncrypted",
            "encryptionKeyVersion", "createdAt"
          )
          VALUES (
            gen_random_uuid()::text,
            ${screening.id}, ${i},
            pgp_sym_encrypt(${answerValue}::text, current_setting('app.mh_encryption_key')),
            1, NOW()
          )
        `;
      }

      // 7. Audit log
      await recordMHAccess(tx, {
        actorId: user.id,
        actorRole: user.role as Parameters<typeof recordMHAccess>[1]['actorRole'],
        action: 'READ_META',
        targetType: 'MHScreening',
        targetId: screening.id,
        targetUserId: user.id,
        organizationId: userRecord.organizationId,
        metadata: {
          event: 'MH_SCREENING_SUBMITTED',
          instrument: 'PHQ9',
          phase: body.phase,
          severity: scoring.severity,
          flagged: scoring.flagged,
          immediateContact: scoring.immediateContact,
          interpretationKey: scoring.interpretationKey,
        },
      });

      // 8. Auto-referral for RED
      if (scoring.severity === 'RED') {
        log.info('RED severity — triggering SAC referral', {
          screeningId: screening.id,
          immediateContact: scoring.immediateContact,
        });

        await createReferralForRED(screening.id, tx, {
          userId: user.id,
          organizationId: userRecord.organizationId,
          immediateContact: scoring.immediateContact,
          cohortId: body.cohortId,
        });
      }

      return {
        screeningId: screening.id,
        severity: scoring.severity,
        flagged: scoring.flagged,
        immediateContact: scoring.immediateContact,
        interpretationKey: scoring.interpretationKey,
      };
    });

    log.info('MH submission complete', {
      userId: user.id,
      severity: result.severity,
      immediateContact: result.immediateContact,
    });

    return ApiResponse.success(result, 201);
  },
});

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, log }) => {
    log.info('MH submissions GET (own list)', { userId: user.id });

    const screenings = await withMHContext({ id: user.id }, async (tx) => {
      await recordMHAccess(tx, {
        actorId: user.id,
        actorRole: user.role as Parameters<typeof recordMHAccess>[1]['actorRole'],
        action: 'READ_META',
        targetType: 'MHScreening',
        targetUserId: user.id,
        metadata: { query: 'list_own_screenings' },
      });

      const rows = await tx.mHScreening.findMany({
        where: { userId: user.id, deletedAt: null },
        select: {
          id: true,
          instrument: true,
          phase: true,
          severity: true,
          flagged: true,
          immediateContact: true,
          recordedAt: true,
        },
        orderBy: { recordedAt: 'desc' },
      });

      return rows;
    });

    return ApiResponse.success(screenings);
  },
});

