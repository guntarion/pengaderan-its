'use client';

/**
 * src/components/safeguard/EducationalBanner.tsx
 * NAWASENA M10 — Permanent non-dismissible banner about Permen 55/2024.
 *
 * IMPORTANT: This banner must NEVER be dismissible.
 * It serves as a constant reminder that physical, verbal, and psychological
 * punishment is PROHIBITED under Permendikbudristek No. 55/2024.
 */

import { AlertTriangle } from 'lucide-react';

interface EducationalBannerProps {
  className?: string;
}

export function EducationalBanner({ className }: EducationalBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4 ${className ?? ''}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Konsekuensi Pedagogis — Permen 55/2024
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Berdasarkan Permendikbudristek Nomor 55 Tahun 2024 tentang Pencegahan dan Penanganan
            Kekerasan di Lingkungan Pendidikan, <strong>dilarang keras</strong> memberikan:
          </p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-800 dark:text-amber-300">
            <li>Hukuman fisik (push-up, berdiri lama, squat jump, dll.)</li>
            <li>Kekerasan verbal (bentakan, cacian, panggilan merendahkan)</li>
            <li>Hukuman psikologis (isolasi, pengucilan, dll.)</li>
          </ul>
          <p className="mt-1.5 text-xs font-medium text-amber-900 dark:text-amber-200">
            Hanya pilih dari opsi konsekuensi yang tersedia dalam sistem ini. Pelanggaran
            terhadap ketentuan ini merupakan tindak kekerasan yang dapat diproses secara hukum.
          </p>
        </div>
      </div>
    </div>
  );
}
