'use client';

/**
 * src/components/pulse/OfflineIndicator.tsx
 * NAWASENA M04 — Offline status indicator.
 *
 * Shows online/offline status banner and queued pulse count.
 * Listens to navigator.onLine events.
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface OfflineIndicatorProps {
  queuedCount?: number;
  onSyncNow?: () => void;
  isSyncing?: boolean;
}

export function OfflineIndicator({ queuedCount = 0, onSyncNow, isSyncing = false }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();

    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (isOnline && queuedCount === 0) return null;

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm">
        <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-amber-700 dark:text-amber-400">
          Offline. Pulse akan disinkronkan saat koneksi kembali.
          {queuedCount > 0 && (
            <span className="font-medium ml-1">({queuedCount} tertunda)</span>
          )}
        </span>
      </div>
    );
  }

  if (queuedCount > 0) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl text-sm">
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span className="text-sky-700 dark:text-sky-400">
            {queuedCount} pulse belum tersinkron
          </span>
        </div>
        {onSyncNow && (
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-800 font-medium"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Menyinkron...' : 'Sinkronkan'}
          </button>
        )}
      </div>
    );
  }

  return null;
}
