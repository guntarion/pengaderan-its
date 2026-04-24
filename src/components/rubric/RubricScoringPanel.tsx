/**
 * src/components/rubric/RubricScoringPanel.tsx
 * NAWASENA M04 — Rubric scoring panel for KP.
 *
 * - 4-level selector with AAC&U labels
 * - Optional note textarea
 * - Acquires Redis lock on mount, releases on unmount
 * - Handles 409 Conflict (another KP has the lock)
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { toast } from '@/lib/toast';

const LEVEL_INFO = [
  {
    level: 1,
    label: 'Benchmark',
    description: 'Refleksi masih permukaan; belum ada analisis mendalam.',
    className: 'border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600',
    activeClassName: 'border-gray-500 bg-gray-100 dark:bg-gray-700 ring-2 ring-gray-400',
  },
  {
    level: 2,
    label: 'Milestone 2',
    description: 'Mendeskripsikan pengalaman dengan cukup detail, pelajaran mulai terlihat.',
    className: 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700',
    activeClassName: 'border-blue-400 bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400',
  },
  {
    level: 3,
    label: 'Milestone 3',
    description: 'Analisis kritis atas pengalaman; menghubungkan nilai dan konteks.',
    className: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700',
    activeClassName: 'border-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-400',
  },
  {
    level: 4,
    label: 'Capstone',
    description: 'Refleksi transformatif; rencana aksi konkret & wawasan mendalam.',
    className: 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700',
    activeClassName: 'border-amber-400 bg-amber-100 dark:bg-amber-900/40 ring-2 ring-amber-400',
  },
];

interface RubricScoringPanelProps {
  journalId: string;
  weekNumber: number;
  cohortId: string;
  onScored?: (score: { id: string; level: number; comment: string | null }) => void;
}

export function RubricScoringPanel({
  journalId,
  weekNumber,
  cohortId,
  onScored,
}: RubricScoringPanelProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockStatus, setLockStatus] = useState<'acquiring' | 'locked' | 'conflict' | 'no-redis'>('acquiring');
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Acquire lock on mount
  useEffect(() => {
    async function acquireLock() {
      try {
        const res = await fetch(`/api/rubric-score/lock/${journalId}`, {
          method: 'POST',
        });

        if (res.ok) {
          setLockStatus('locked');
          // Start heartbeat every 60s
          heartbeatRef.current = setInterval(async () => {
            await fetch(`/api/rubric-score/lock/${journalId}`, { method: 'PUT' });
          }, 60_000);
        } else if (res.status === 409) {
          setLockStatus('conflict');
          toast.error('Journal sedang dinilai oleh KP lain. Coba lagi nanti.');
        } else {
          // Assume no redis configured — allow anyway
          setLockStatus('no-redis');
        }
      } catch {
        setLockStatus('no-redis');
      }
    }

    acquireLock();

    return () => {
      // Release lock and stop heartbeat on unmount
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      fetch(`/api/rubric-score/lock/${journalId}`, { method: 'DELETE' }).catch(() => {});
    };
  }, [journalId]);

  async function handleSubmit() {
    if (!selectedLevel) {
      toast.error('Pilih level rubrik terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/rubric-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalId,
          rubrikKey: 'JOURNAL_REFLECTION',
          level: selectedLevel,
          weekNumber,
          cohortId,
          comment: comment.trim() || null,
        }),
      });

      if (res.ok) {
        const body = await res.json();
        toast.success(`Level ${selectedLevel} berhasil disimpan.`);
        onScored?.(body.data);
      } else if (res.status === 409) {
        toast.error('Journal ini sudah dinilai sebelumnya.');
      } else {
        const body = await res.json();
        toast.apiError(body);
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (lockStatus === 'acquiring') {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
        <span className="ml-2 text-sm text-gray-500">Mengambil akses penilaian...</span>
      </div>
    );
  }

  if (lockStatus === 'conflict') {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-center">
        <Lock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
          Journal ini sedang dinilai oleh KP lain.
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          Tunggu beberapa menit dan coba lagi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Pilih Level AAC&U
      </h3>

      {/* Level selector */}
      <div className="space-y-2">
        {LEVEL_INFO.map((info) => (
          <button
            key={info.level}
            onClick={() => setSelectedLevel(info.level)}
            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
              selectedLevel === info.level ? info.activeClassName : info.className
            }`}
          >
            <div className="flex items-start gap-2">
              <div
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  selectedLevel === info.level
                    ? 'border-current bg-current'
                    : 'border-current bg-transparent'
                }`}
              >
                {selectedLevel === info.level && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Level {info.level} — {info.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {info.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Comment textarea */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Catatan untuk Maba{' '}
          <span className="text-xs text-gray-400">(opsional)</span>
        </label>
        <textarea
          className="w-full min-h-[100px] px-4 py-2.5 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 resize-y"
          placeholder="Tambahkan catatan atau umpan balik untuk Maba..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
        />
        <p className="text-xs text-gray-400 text-right">{comment.length}/2000</p>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!selectedLevel || isSubmitting}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
          selectedLevel && !isSubmitting
            ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700 shadow-md'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
        }`}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Menyimpan...' : 'Simpan Penilaian'}
      </button>
    </div>
  );
}
