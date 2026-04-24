'use client';

/**
 * src/components/mental-health/ScreeningResult.tsx
 * NAWASENA M11 — Non-numeric screening result display.
 *
 * DESIGN:
 *   - NEVER show raw score number to Maba.
 *   - Show interpretation text (non-clinical, supportive language).
 *   - Severity mapping to non-stigmatizing labels.
 *   - EmergencyBanner shown when immediateContact=true.
 *   - Resource panel links always shown.
 */

import React from 'react';
import Link from 'next/link';
import { EmergencyBanner } from './EmergencyBanner';
import { CheckCircle2, BookOpen } from 'lucide-react';

interface ScreeningResultProps {
  severity: 'GREEN' | 'YELLOW' | 'RED';
  flagged: boolean;
  immediateContact: boolean;
  interpretationKey: string;
  instrument: string;
  phase: string;
}

// Non-stigmatizing interpretation text per interpretation key
const INTERPRETATION_TEXT: Record<string, { headline: string; body: string }> = {
  'phq9.minimal': {
    headline: 'Kondisimu terlihat stabil',
    body: 'Terima kasih sudah meluangkan waktu untuk mengisi skrining ini. Menjaga kesehatan mental adalah bagian penting dari perjalanan kamu. Teruslah merawat dirimu dengan baik.',
  },
  'phq9.mild': {
    headline: 'Ada beberapa hal yang perlu kamu perhatikan',
    body: 'Kamu sudah mengambil langkah penting dengan mengisi skrining ini. Ada beberapa hal yang mungkin membuatmu merasa lebih lelah dari biasanya — dan itu wajar. Coba lihat sumber daya dukungan yang kami siapkan untukmu.',
  },
  'phq9.moderate': {
    headline: 'Ini saat yang tepat untuk berbicara dengan seseorang',
    body: 'Kamu sudah berani mengisi skrining ini — itu tanda kekuatan, bukan kelemahan. Konselor SAC siap mendengarkan dan mendukungmu. Kamu tidak perlu menghadapi ini sendirian.',
  },
  'phq9.moderately_severe': {
    headline: 'Konselor SAC akan segera menghubungimu',
    body: 'Jawaban kamu menunjukkan bahwa kamu membutuhkan dukungan lebih. Konselor SAC yang berpengalaman akan menghubungimu untuk berbincang dan mencari jalan keluar bersama. Ini adalah tanda bahwa kamu peduli pada dirimu sendiri.',
  },
  'phq9.severe': {
    headline: 'Konselor SAC akan segera menghubungimu',
    body: 'Terima kasih sudah mempercayai kami dengan menjawab skrining ini dengan jujur. Konselor SAC yang berpengalaman akan menghubungimu segera. Dukungan sudah dalam perjalanan menuju kamu.',
  },
};

// Non-stigma labels (don't use clinical terms like "depressed", "severe")
const SEVERITY_INFO: Record<string, { label: string; colorClasses: string }> = {
  GREEN: {
    label: 'Kondisi Stabil',
    colorClasses: 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
  },
  YELLOW: {
    label: 'Perlu Perhatian',
    colorClasses: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
  },
  RED: {
    label: 'Dukungan Segera',
    colorClasses: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
  },
};

export function ScreeningResult({
  severity,
  immediateContact,
  interpretationKey,
}: ScreeningResultProps) {
  const text = INTERPRETATION_TEXT[interpretationKey] ?? INTERPRETATION_TEXT['phq9.minimal'];
  const severityInfo = SEVERITY_INFO[severity];

  return (
    <div className="flex flex-col gap-5">
      {/* Emergency banner — ALWAYS first if immediateContact */}
      <EmergencyBanner visible={immediateContact} />

      {/* Status badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium w-fit ${severityInfo.colorClasses}`}>
        <CheckCircle2 className="w-4 h-4" />
        {severityInfo.label}
      </div>

      {/* Interpretation text */}
      <div>
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-2">
          {text.headline}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {text.body}
        </p>
      </div>

      {/* Resource links — always shown */}
      <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">Sumber Daya Pendukung</span>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/mental-health/self-care" className="text-sm text-sky-600 dark:text-sky-400 hover:underline">
            Tips perawatan diri sehari-hari →
          </Link>
          <Link href="/mental-health/help-seeking" className="text-sm text-sky-600 dark:text-sky-400 hover:underline">
            Cara mencari bantuan →
          </Link>
          <Link href="/mental-health" className="text-sm text-sky-600 dark:text-sky-400 hover:underline">
            Pusat sumber daya kesehatan mental →
          </Link>
        </div>
      </div>

      {/* Dashboard link */}
      <Link
        href="/dashboard"
        className="text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        &larr; Kembali ke Dashboard
      </Link>
    </div>
  );
}
