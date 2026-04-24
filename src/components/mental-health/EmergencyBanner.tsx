'use client';

/**
 * src/components/mental-health/EmergencyBanner.tsx
 * NAWASENA M11 — Emergency banner shown when immediateContact=true.
 *
 * DESIGN INTENT:
 *   - Always visible above result when immediateContact=true.
 *   - Warm, non-alarming tone — no clinical language.
 *   - Direct SAC contact info + national hotline.
 *   - NEVER use alarming medical language.
 */

import React from 'react';
import { Phone, Heart } from 'lucide-react';

interface EmergencyBannerProps {
  visible: boolean;
}

export function EmergencyBanner({ visible }: EmergencyBannerProps) {
  if (!visible) return null;

  return (
    <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-800">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center shrink-0 mt-0.5">
          <Heart className="w-5 h-5 text-rose-600 dark:text-rose-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-rose-800 dark:text-rose-200 mb-1">
            Kamu tidak sendirian
          </h3>
          <p className="text-sm text-rose-700 dark:text-rose-300 mb-3">
            Jawaban kamu menunjukkan bahwa kamu sedang mengalami sesuatu yang berat. Konselor SAC
            HMTC akan menghubungimu dalam waktu dekat untuk mengobrol dan mendukungmu. Kamu tidak
            perlu menghadapi ini sendiri.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="tel:119"
              className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 transition-colors"
            >
              <Phone className="w-4 h-4 shrink-0" />
              Hotline Kemenkes: 119 ext 8 (24 jam, gratis)
            </a>
            <p className="text-xs text-rose-600 dark:text-rose-400">
              Atau hubungi SAC HMTC melalui WA/email: sac@hmtc.its.ac.id
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
