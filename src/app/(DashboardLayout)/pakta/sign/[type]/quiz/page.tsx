'use client';

/**
 * /pakta/sign/[type]/quiz
 * Pakta signing — Step 2: Post-test quiz.
 *
 * Query params: versionId, passingScore
 * On pass → navigate to confirm page with versionId + score.
 * On fail → show feedback + "Baca ulang" button → back to reader.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PaktaQuiz, type QuizQuestion } from '@/components/pakta/PaktaQuiz';
import { SkeletonText } from '@/components/shared/skeletons';
import { ClipboardList } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('pakta-quiz-page');

type PaktaType = 'PAKTA_PANITIA' | 'SOCIAL_CONTRACT_MABA' | 'PAKTA_PENGADER_2027';

const TYPE_LABELS: Record<PaktaType, string> = {
  PAKTA_PANITIA: 'Pakta Panitia',
  SOCIAL_CONTRACT_MABA: 'Social Contract MABA',
  PAKTA_PENGADER_2027: 'Pakta Pengader 2027',
};

interface QuizData {
  questions: QuizQuestion[];
}

export default function PaktaQuizPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = params.type as PaktaType;
  const versionId = searchParams.get('versionId') ?? '';
  const passingScore = parseInt(searchParams.get('passingScore') ?? '80', 10);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const label = TYPE_LABELS[type] ?? type;

  useEffect(() => {
    if (!versionId) {
      router.replace(`/pakta/sign/${type}`);
      return;
    }

    async function fetchQuiz() {
      try {
        const res = await fetch(`/api/pakta/current?type=${type}&versionId=${versionId}`);
        if (!res.ok) {
          const json = await res.json();
          toast.apiError(json);
          router.replace(`/pakta/sign/${type}`);
          return;
        }
        const json = await res.json();
        const quizData = json.data.quizQuestions as unknown as QuizData;
        const parsedQuestions = quizData.questions ?? [];
        setQuestions(parsedQuestions);
      } catch (err) {
        toast.error('Gagal memuat quiz');
        log.error('Failed to load quiz', { error: err, versionId });
        router.replace(`/pakta/sign/${type}`);
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuiz();
  }, [versionId, type, router]);

  const handlePassed = (score: number) => {
    router.push(
      `/pakta/sign/${type}/confirm?versionId=${versionId}&score=${score}`
    );
  };

  const handleFailed = () => {
    // Go back to reading page
    router.push(`/pakta/sign/${type}?versionId=${versionId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{label} — Post-Test</h1>
              <p className="text-sm text-sky-100 mt-0.5">
                Skor minimal {passingScore} untuk melanjutkan
              </p>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="h-5 w-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center">✓</span>
            Baca Dokumen
          </div>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400">
            <span className="h-5 w-5 rounded-full bg-sky-500 text-white text-xs flex items-center justify-center">2</span>
            Post-Test
          </div>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs flex items-center justify-center">3</span>
            Konfirmasi
          </div>
        </div>

        {/* Quiz */}
        {isLoading ? (
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5">
            <SkeletonText lines={15} />
          </div>
        ) : (
          <PaktaQuiz
            versionId={versionId}
            quizQuestions={questions}
            passingScore={passingScore}
            onPassed={handlePassed}
            onFailed={handleFailed}
          />
        )}
      </div>
    </div>
  );
}
