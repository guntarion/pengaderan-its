'use client';

/**
 * src/components/pakta/PaktaQuiz.tsx
 * Post-test quiz component for pakta signing flow.
 *
 * Renders 5 quiz questions from quizQuestions JSON, submits to API,
 * handles score display and pass/fail flow.
 *
 * Props:
 *   versionId     — PaktaVersion.id
 *   quizQuestions — array of quiz questions
 *   onPassed      — called with score when score >= passingScore
 *   onFailed      — called when score < passingScore (user can re-read)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { createLogger } from '@/lib/logger';

const log = createLogger('PaktaQuiz');

export interface QuizQuestion {
  id: string;
  question: string;
  options: Array<{ id: string; text: string }>;
  correctAnswerIds: string[]; // for multi-select support
}

export interface QuizSubmitResult {
  score: number;
  passed: boolean;
  passingScore: number;
  // Present when failed — shows which answers were correct
  correctAnswers?: Array<{ questionId: string; correctAnswerIds: string[] }>;
}

interface PaktaQuizProps {
  versionId: string;
  quizQuestions: QuizQuestion[];
  passingScore?: number;
  onPassed: (score: number) => void;
  onFailed: () => void; // user clicks "Baca ulang"
}

export function PaktaQuiz({
  versionId,
  quizQuestions,
  onPassed,
  onFailed,
}: PaktaQuizProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  const allAnswered = quizQuestions.every((q) => answers[q.id]);

  const selectAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setIsSubmitting(true);
    setResult(null);

    try {
      const payload = {
        versionId,
        answers: Object.entries(answers).map(([questionId, selectedId]) => ({
          questionId,
          selectedIds: [selectedId],
        })),
      };

      const res = await fetch('/api/pakta/quiz-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.apiError(json);
        return;
      }

      const quizResult = json.data as QuizSubmitResult;
      setResult(quizResult);

      if (quizResult.passed) {
        log.info('Quiz passed', { score: quizResult.score, versionId });
        // Small delay before navigating
        setTimeout(() => onPassed(quizResult.score), 1200);
      } else {
        log.info('Quiz failed', { score: quizResult.score, versionId });
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat mengirim jawaban');
      log.error('Quiz submit error', { error: err });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Result banner */}
      {result && (
        <div
          className={[
            'rounded-2xl border p-5',
            result.passed
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20'
              : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20',
          ].join(' ')}
        >
          <div className="flex items-start gap-3">
            {result.passed ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
            )}
            <div>
              <p
                className={[
                  'font-semibold text-base',
                  result.passed
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-700 dark:text-red-400',
                ].join(' ')}
              >
                {result.passed ? 'Selamat! Anda lulus post-test' : 'Belum lulus'}
              </p>
              <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">
                Skor Anda: <strong>{result.score}</strong> / 100
                {!result.passed && (
                  <> (diperlukan minimal {result.passingScore})</>
                )}
              </p>
              {!result.passed && (
                <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
                  Silakan baca ulang dokumen pakta dan coba kembali.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      {quizQuestions.map((q, idx) => {
        const correctAnswerIds = result?.correctAnswers?.find(
          (a) => a.questionId === q.id
        )?.correctAnswerIds;

        return (
          <div
            key={q.id}
            className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 space-y-3"
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {idx + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((option) => {
                const isSelected = answers[q.id] === option.id;
                const isCorrect = correctAnswerIds?.includes(option.id);
                const isWrong = result && isSelected && !correctAnswerIds?.includes(option.id);

                let optionClass =
                  'flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer text-sm transition-colors ';

                if (result) {
                  if (isCorrect) {
                    optionClass +=
                      'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400';
                  } else if (isWrong) {
                    optionClass +=
                      'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400';
                  } else {
                    optionClass +=
                      'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400';
                  }
                } else if (isSelected) {
                  optionClass +=
                    'border-sky-400 dark:border-sky-600 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300';
                } else {
                  optionClass +=
                    'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/20';
                }

                return (
                  <div
                    key={option.id}
                    className={optionClass}
                    onClick={() => !result && selectAnswer(q.id, option.id)}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !result) {
                        selectAnswer(q.id, option.id);
                      }
                    }}
                  >
                    <div
                      className={[
                        'h-4 w-4 rounded-full border-2 flex-shrink-0',
                        isSelected && !result
                          ? 'border-sky-500 bg-sky-500'
                          : result && isCorrect
                            ? 'border-emerald-500 bg-emerald-500'
                            : result && isWrong
                              ? 'border-red-500 bg-red-500'
                              : 'border-gray-300 dark:border-gray-600',
                      ].join(' ')}
                    />
                    {option.text}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Submit / Re-read buttons */}
      {!result && (
        <div className="flex flex-col gap-3">
          {!allAnswered && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span>
                Jawab semua pertanyaan ({Object.keys(answers).length}/
                {quizQuestions.length} dijawab)
              </span>
            </div>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Mengirim...
              </span>
            ) : (
              'Kirim Jawaban'
            )}
          </Button>
        </div>
      )}

      {result && !result.passed && (
        <Button
          onClick={onFailed}
          variant="outline"
          className="w-full border-sky-300 text-sky-700 dark:text-sky-300 bg-transparent hover:bg-sky-50 dark:hover:bg-sky-950/20"
        >
          Baca Ulang Dokumen
        </Button>
      )}
    </div>
  );
}
