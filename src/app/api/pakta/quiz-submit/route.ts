/**
 * POST /api/pakta/quiz-submit
 * Compute quiz score and return pass/fail result.
 *
 * Does NOT sign the pakta — signing is a separate endpoint.
 * This allows multiple attempts without creating audit spam.
 *
 * Body: { versionId, answers: [{ questionId, selectedIds }] }
 * Response: { score, passed, passingScore, correctAnswers? }
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { NotFoundError, BadRequestError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const quizSubmitSchema = z.object({
  versionId: z.string().min(1, 'versionId wajib'),
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        selectedIds: z.array(z.string()).min(1, 'Pilih minimal satu jawaban'),
      })
    )
    .min(1, 'Jawaban tidak boleh kosong'),
});

interface QuizQuestion {
  id: string;
  question: string;
  options: Array<{ id: string; text: string }>;
  correctAnswerIds: string[];
}

interface QuizData {
  questions: QuizQuestion[];
}

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, quizSubmitSchema);
    const { versionId, answers } = body;

    // Fetch PaktaVersion
    const paktaVersion = await prisma.paktaVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        quizQuestions: true,
        passingScore: true,
        status: true,
        organizationId: true,
      },
    });

    if (!paktaVersion) {
      throw NotFoundError('PaktaVersion');
    }

    // Only PUBLISHED versions can be submitted
    if (paktaVersion.status !== 'PUBLISHED') {
      throw BadRequestError('Dokumen pakta belum diterbitkan');
    }

    // Parse quiz questions
    const quizData = paktaVersion.quizQuestions as unknown as QuizData;
    if (!quizData || !Array.isArray(quizData.questions)) {
      throw BadRequestError('Data quiz tidak valid');
    }
    const questions = quizData.questions;

    if (answers.length !== questions.length) {
      throw BadRequestError(
        `Jumlah jawaban tidak sesuai: diharapkan ${questions.length}, diterima ${answers.length}`
      );
    }

    // Score each answer
    let correctCount = 0;
    const correctAnswersForFeedback: Array<{
      questionId: string;
      correctAnswerIds: string[];
    }> = [];

    for (const question of questions) {
      const userAnswer = answers.find((a) => a.questionId === question.id);
      if (!userAnswer) {
        throw BadRequestError(`Jawaban untuk pertanyaan ${question.id} tidak ditemukan`);
      }

      const userSelectedSet = new Set(userAnswer.selectedIds);
      const correctSet = new Set(question.correctAnswerIds);

      // For single-answer: check if selected matches correct
      const isCorrect =
        userSelectedSet.size === correctSet.size &&
        [...userSelectedSet].every((id) => correctSet.has(id));

      if (isCorrect) {
        correctCount++;
      } else {
        correctAnswersForFeedback.push({
          questionId: question.id,
          correctAnswerIds: question.correctAnswerIds,
        });
      }
    }

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= paktaVersion.passingScore;

    log.info('Quiz submitted', {
      userId: user.id,
      versionId,
      score,
      passed,
      correctCount,
      totalQuestions: questions.length,
    });

    return ApiResponse.success({
      score,
      passed,
      passingScore: paktaVersion.passingScore,
      // Only show correct answers on failure (to guide re-reading)
      correctAnswers: passed ? undefined : correctAnswersForFeedback,
    });
  },
});
