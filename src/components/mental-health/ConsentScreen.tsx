'use client';

/**
 * src/components/mental-health/ConsentScreen.tsx
 * NAWASENA M11 — MH Consent screen component.
 *
 * Renders the 5-point summary + full consent text, then provides
 * Accept and Decline buttons. Non-stigmatizing language. No score references.
 *
 * DESIGN INTENT (Maba-facing, non-stigma):
 *   - Calm teal/violet palette — no alarm colors.
 *   - Consent text rendered from markdown source (v1.md).
 *   - Full text scrollable in a contained box before Accept is enabled.
 *   - Explicit acknowledgment checkbox before submit.
 */

import React, { useState, useRef, useEffect } from 'react';
import { MarkdownRender } from '@/components/shared/MarkdownRender';
import { toast } from '@/lib/toast';
import { Shield, ChevronDown } from 'lucide-react';

interface ConsentScreenProps {
  consentMarkdown: string;
  cohortId: string;
  consentVersion: string;
  onAccepted: () => void;
  onDeclined: () => void;
}

export function ConsentScreen({
  consentMarkdown,
  cohortId,
  consentVersion,
  onAccepted,
  onDeclined,
}: ConsentScreenProps) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Enable button only after user has scrolled past 90% of the content
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const ratio = el.scrollTop / (el.scrollHeight - el.clientHeight);
    if (ratio >= 0.9) setScrolledToBottom(true);
  }

  // Auto-check scroll for short content that doesn't overflow
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight) {
      setScrolledToBottom(true);
    }
  }, [consentMarkdown]);

  async function handleAccept() {
    if (!acknowledged || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/mental-health/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortId,
          consentVersion,
          scope: { screening: true, research: false },
        }),
      });

      const json = (await res.json()) as { success: boolean; data?: { consentId: string }; error?: { message: string } };

      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'Gagal menyimpan persetujuan. Coba lagi.');
        return;
      }

      toast.success('Persetujuan berhasil disimpan.');
      onAccepted();
    } catch {
      toast.error('Gagal terhubung ke server. Periksa koneksi internet.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const canAccept = scrolledToBottom && acknowledged && !isSubmitting;

  return (
    <div className="flex flex-col gap-6">
      {/* Header badge */}
      <div className="flex items-center gap-3 p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">Kerahasiaan Terjamin</p>
          <p className="text-xs text-teal-600 dark:text-teal-400">
            Jawaban kamu dienkripsi dan hanya dapat diakses oleh konselor yang ditugaskan untukmu.
          </p>
        </div>
      </div>

      {/* Consent text scroll box */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-72 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-2xl p-5 bg-white dark:bg-gray-900 scroll-smooth"
        >
          <MarkdownRender content={consentMarkdown} />
        </div>

        {/* Scroll hint */}
        {!scrolledToBottom && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 bg-white/90 dark:bg-gray-900/90 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
            <ChevronDown className="w-3 h-3 animate-bounce" />
            Gulir ke bawah untuk membaca seluruh teks
          </div>
        )}
      </div>

      {/* Acknowledgment checkbox */}
      <label
        className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
          acknowledged
            ? 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/40'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-600'
        } ${!scrolledToBottom ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <input
          type="checkbox"
          className="mt-0.5 w-4 h-4 accent-teal-600 shrink-0"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          disabled={!scrolledToBottom}
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Saya telah membaca dan memahami teks persetujuan di atas. Saya memberikan izin sukarela
          untuk penggunaan data skrining sesuai dengan tujuan yang telah dijelaskan (Versi{' '}
          <span className="font-mono font-semibold">{consentVersion}</span>).
        </span>
      </label>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onDeclined}
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Tidak Sekarang
        </button>
        <button
          onClick={handleAccept}
          disabled={!canAccept}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Menyimpan...' : 'Saya Setuju'}
        </button>
      </div>

      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
        Kamu dapat mencabut persetujuan ini kapan saja melalui menu{' '}
        <span className="font-medium">Privasi &rarr; Kontrol Data Saya</span>.
      </p>
    </div>
  );
}
