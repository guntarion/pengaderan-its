'use client';

/**
 * src/components/notifications/PushPermissionPrompt.tsx
 * NAWASENA M15 — Banner shown in dashboard to prompt push subscription
 * Only shows if push not subscribed AND permission not denied.
 * Dismissable (stored in localStorage).
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X, Loader2 } from 'lucide-react';
import { usePushSubscription } from '@/hooks/use-push-subscription';

const DISMISSED_KEY = 'nawasena_push_prompt_dismissed';

export function PushPermissionPrompt() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } = usePushSubscription();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const wasDismissed = localStorage.getItem(DISMISSED_KEY) === 'true';
    setDismissed(wasDismissed);
  }, []);

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  }

  async function handleEnable() {
    const success = await subscribe();
    if (success) {
      // Also clear the dismissed flag so it won't show anymore (isSubscribed will hide it)
      localStorage.removeItem(DISMISSED_KEY);
    }
  }

  // Don't render: SSR, not supported, already subscribed, permission denied, dismissed
  if (!mounted) return null;
  if (!isSupported) return null;
  if (isSubscribed) return null;
  if (permission === 'denied') return null;
  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950 dark:to-blue-950 border border-sky-200 dark:border-sky-800 rounded-2xl p-4 flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center flex-shrink-0">
        <Bell className="h-5 w-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Aktifkan notifikasi push
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Dapatkan pengingat penting langsung di browser Anda — reminder jurnal, pulse, dan eskalasi.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl h-8 px-3 text-xs"
          disabled={isLoading}
          onClick={handleEnable}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Bell className="h-3.5 w-3.5 mr-1" />
          )}
          {isLoading ? 'Mengaktifkan...' : 'Aktifkan'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 rounded-lg"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
