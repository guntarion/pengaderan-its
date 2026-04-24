'use client';

/**
 * src/hooks/use-install-prompt.ts
 * NAWASENA M04 — PWA install prompt hook.
 *
 * Tracks:
 *   - nawasena_signin_count: incremented on mount
 *   - nawasena_pwa_dismiss_count: incremented on dismiss
 *   - nawasena_pwa_last_dismiss: ISO date string
 *
 * Show condition:
 *   - signinCount >= 2
 *   - dismissCount < 3
 *   - no lastDismiss OR lastDismiss > 7 days ago
 */

import { useState, useEffect, useCallback } from 'react';

const LS_SIGNIN_COUNT = 'nawasena_signin_count';
const LS_DISMISS_COUNT = 'nawasena_pwa_dismiss_count';
const LS_LAST_DISMISS = 'nawasena_pwa_last_dismiss';
const DISMISS_COOLDOWN_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UseInstallPromptReturn {
  canInstall: boolean;
  triggerInstall: () => Promise<void>;
  dismiss: () => void;
}

function safeGetInt(key: string, defaultValue = 0): number {
  try {
    return parseInt(localStorage.getItem(key) ?? String(defaultValue), 10) || defaultValue;
  } catch {
    return defaultValue;
  }
}

function shouldShowBanner(): boolean {
  try {
    const signinCount = safeGetInt(LS_SIGNIN_COUNT);
    const dismissCount = safeGetInt(LS_DISMISS_COUNT);
    const lastDismiss = localStorage.getItem(LS_LAST_DISMISS);

    if (signinCount < 2) return false;
    if (dismissCount >= 3) return false;

    if (lastDismiss) {
      const daysSinceDismiss =
        (Date.now() - new Date(lastDismiss).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < DISMISS_COOLDOWN_DAYS) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function useInstallPrompt(): UseInstallPromptReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Increment sign-in count on mount
    try {
      const current = safeGetInt(LS_SIGNIN_COUNT);
      localStorage.setItem(LS_SIGNIN_COUNT, String(current + 1));
    } catch {
      // localStorage unavailable — ignore
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(shouldShowBanner());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If already prompted before
    if (shouldShowBanner()) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setCanInstall(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    try {
      const current = safeGetInt(LS_DISMISS_COUNT);
      localStorage.setItem(LS_DISMISS_COUNT, String(current + 1));
      localStorage.setItem(LS_LAST_DISMISS, new Date().toISOString());
    } catch {
      // ignore
    }
    setCanInstall(false);
  }, []);

  return { canInstall, triggerInstall, dismiss };
}
