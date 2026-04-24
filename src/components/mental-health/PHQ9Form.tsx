'use client';

/**
 * src/components/mental-health/PHQ9Form.tsx
 * NAWASENA M11 — PHQ-9 screening form component.
 *
 * DESIGN:
 *   - One question per step with progress indicator.
 *   - Non-clinical framing — question text from JSON bank.
 *   - Item #9 shows special guidance text (from JSON guidanceId field).
 *   - Submit → POST /api/mental-health/submissions.
 *   - On result → pass result to onComplete callback.
 *
 * PRIVACY-CRITICAL:
 *   - Answers are only held in local state, never logged or stored client-side.
 *   - No score calculation on client — scoring happens server-side only.
 */

import React, { useState } from 'react';
import { toast } from '@/lib/toast';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import phq9Questions from '@/content/mh-instruments/phq9-id.json';

interface PHQ9FormProps {
  cohortId: string;
  consentId: string;
  phase: 'F1' | 'F4' | 'SELF_TRIGGERED';
  onComplete: (result: {
    screeningId: string;
    severity: 'GREEN' | 'YELLOW' | 'RED';
    flagged: boolean;
    immediateContact: boolean;
    interpretationKey: string;
    instrument: string;
    phase: string;
  }) => void;
}

type PHQ9Question = {
  index: number;
  textId: string;
  guidanceId?: string;
  options: { value: number; labelId: string }[];
};

const QUESTIONS: PHQ9Question[] = phq9Questions as PHQ9Question[];
const TOTAL = QUESTIONS.length;

export function PHQ9Form({ cohortId, consentId, phase, onComplete }: PHQ9FormProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(TOTAL).fill(null));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = QUESTIONS[currentIndex];
  const currentAnswer = answers[currentIndex];
  const isLast = currentIndex === TOTAL - 1;
  const isFirst = currentIndex === 0;
  const answeredCount = answers.filter((a) => a !== null).length;

  function selectAnswer(value: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = value;
      return next;
    });
  }

  function handleNext() {
    if (currentAnswer === null) {
      toast.error('Pilih salah satu jawaban sebelum melanjutkan');
      return;
    }
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleBack() {
    if (!isFirst) setCurrentIndex((i) => i - 1);
  }

  async function handleSubmit() {
    // Validate all answers filled
    if (answers.some((a) => a === null)) {
      toast.error('Semua pertanyaan harus dijawab');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/mental-health/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortId,
          phase,
          answers: answers as number[],
          consentId,
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        data?: {
          screeningId: string;
          severity: 'GREEN' | 'YELLOW' | 'RED';
          flagged: boolean;
          immediateContact: boolean;
          interpretationKey: string;
        };
        error?: { message: string };
      };

      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'Gagal menyimpan skrining. Coba lagi.');
        return;
      }

      onComplete({
        ...json.data!,
        instrument: 'PHQ9',
        phase,
      });
    } catch {
      toast.error('Gagal terhubung ke server. Periksa koneksi internet.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Pertanyaan {currentIndex + 1} dari {TOTAL}</span>
          <span>{answeredCount} terjawab</span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-sky-500 transition-all duration-300"
            style={{ width: `${((currentIndex) / TOTAL) * 100}%` }}
          />
        </div>
      </div>

      {/* Context text */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Selama <strong className="text-gray-600 dark:text-gray-300">2 minggu terakhir</strong>,
        seberapa sering kamu mengalami hal berikut?
      </p>

      {/* Question */}
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-relaxed">
          {question.textId}
        </p>

        {/* Special guidance for item #9 */}
        {question.guidanceId && (
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 rounded-xl">
            <p className="text-xs text-sky-700 dark:text-sky-300">
              {question.guidanceId}
            </p>
          </div>
        )}

        {/* Answer options */}
        <div className="flex flex-col gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => selectAnswer(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                currentAnswer === opt.value
                  ? 'border-teal-400 dark:border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-medium'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              {opt.labelId}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {!isFirst && (
          <button
            onClick={handleBack}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Kembali
          </button>
        )}

        <div className="flex-1" />

        {!isLast ? (
          <button
            onClick={handleNext}
            disabled={currentAnswer === null}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Lanjut
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={currentAnswer === null || isSubmitting}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim Skrining'}
          </button>
        )}
      </div>

      {/* Confidentiality reminder */}
      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
        Jawaban kamu dienkripsi dan hanya dapat diakses oleh konselor SAC yang ditugaskan.
      </p>
    </div>
  );
}
