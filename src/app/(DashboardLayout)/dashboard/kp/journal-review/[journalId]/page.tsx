'use client';

/**
 * src/app/(DashboardLayout)/dashboard/kp/journal-review/[journalId]/page.tsx
 * NAWASENA M04 — Two-panel journal scoring view for KP.
 * Left: journal content | Right: RubricScoringPanel
 */

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { RubricScoringPanel } from '@/components/rubric/RubricScoringPanel';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';

interface JournalDetail {
  id: string;
  userId: string;
  cohortId: string;
  weekNumber: number;
  whatHappened: string;
  soWhat: string;
  nowWhat: string;
  wordCount: number;
  status: string;
  isLate: boolean;
  submittedAt: string;
}

interface PageProps {
  params: Promise<{ journalId: string }>;
}

export default function KpJournalDetailPage({ params }: PageProps) {
  const { journalId } = use(params);
  const router = useRouter();

  const [journal, setJournal] = useState<JournalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScored, setIsScored] = useState(false);

  useEffect(() => {
    async function fetchJournal() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/journal/by-id/${journalId}`);
        if (res.status === 403) {
          setError('Anda tidak memiliki akses ke jurnal ini.');
          return;
        }
        if (res.status === 404) {
          setError('Jurnal tidak ditemukan.');
          return;
        }
        if (!res.ok) {
          setError('Gagal memuat jurnal.');
          return;
        }
        const json = await res.json();
        setJournal(json.data);
      } catch {
        setError('Gagal terhubung ke server.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchJournal();
  }, [journalId]);

  function handleScored(score: { id: string; level: number; comment: string | null }) {
    setIsScored(true);
    toast.success(`Jurnal berhasil dinilai — Level ${score.level}`);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="container mx-auto max-w-5xl px-4 py-8 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
          <p className="text-base font-medium text-gray-700 dark:text-gray-300">{error}</p>
          <Link
            href="/dashboard/kp/journal-review"
            className="mt-4 inline-block text-sm text-sky-600 dark:text-sky-400 hover:underline"
          >
            Kembali ke daftar jurnal
          </Link>
        </div>
      </div>
    );
  }

  if (!journal) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/kp/journal-review"
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Kembali ke daftar jurnal"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">
                Nilai Jurnal — Minggu {journal.weekNumber}
              </h1>
              <p className="text-sm text-white/80 mt-0.5">
                {journal.wordCount.toLocaleString()} kata &middot;{' '}
                {journal.isLate && <span className="text-amber-300">Terlambat &middot; </span>}
                Dikumpulkan{' '}
                {new Date(journal.submittedAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-panel content */}
      <div className="container mx-auto max-w-5xl px-4 py-6">
        {isScored ? (
          /* Scored success state */
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-10 text-center shadow-md">
            <CheckCircle className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Penilaian Tersimpan!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Jurnal ini telah berhasil dinilai.
            </p>
            <button
              onClick={() => router.push('/dashboard/kp/journal-review')}
              className="mt-5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium py-2.5 px-6 text-sm transition-colors"
            >
              Kembali ke Daftar
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-5">
            {/* Left: journal content */}
            <div className="flex-1 space-y-4">
              <JournalSection title="Apa yang Terjadi?" content={journal.whatHappened} />
              <JournalSection title="Makna & Pelajaran" content={journal.soWhat} />
              <JournalSection title="Langkah Selanjutnya" content={journal.nowWhat} />
            </div>

            {/* Right: scoring panel */}
            <div className="md:w-80 flex-shrink-0">
              <div className="sticky top-6 bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-md">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Penilaian Rubrik
                </h2>
                <RubricScoringPanel
                  journalId={journal.id}
                  weekNumber={journal.weekNumber}
                  cohortId={journal.cohortId}
                  onScored={handleScored}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function JournalSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-md">
      <h3 className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-3">{title}</h3>
      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    </div>
  );
}
