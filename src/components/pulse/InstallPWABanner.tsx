'use client';

/**
 * src/components/pulse/InstallPWABanner.tsx
 * NAWASENA M04 — PWA install prompt banner.
 *
 * Shown after 2nd sign-in, dismissed up to 3 times (7-day cooldown each time).
 */

import React from 'react';
import { X, Download } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/use-install-prompt';

export function InstallPWABanner() {
  const { canInstall, triggerInstall, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div
      role="banner"
      aria-label="Install aplikasi NAWASENA"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Download className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium truncate">
          Install NAWASENA untuk akses lebih cepat saat offline
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={triggerInstall}
          className="text-xs bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl font-semibold px-3 py-1.5 transition-colors"
          aria-label="Install aplikasi"
        >
          Install
        </button>
        <button
          onClick={dismiss}
          className="p-1 rounded-lg hover:bg-white/20 transition-colors"
          aria-label="Tutup banner install"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
