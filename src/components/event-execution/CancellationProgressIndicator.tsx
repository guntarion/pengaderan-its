'use client';

/**
 * src/components/event-execution/CancellationProgressIndicator.tsx
 * NAWASENA M08 — Shows notification progress after cancellation.
 *
 * Polls /api/event-execution/instances/[id]/cancellation-status every 3s
 * until notificationFailedCount is stable.
 */

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2Icon, AlertCircleIcon, Loader2 } from 'lucide-react';

interface CancellationStatus {
  status: string;
  cancellationReason: string | null;
  notificationFailedCount: number;
  cancelledAt: string | null;
}

interface CancellationProgressIndicatorProps {
  instanceId: string;
}

export function CancellationProgressIndicator({
  instanceId,
}: CancellationProgressIndicatorProps) {
  const [data, setData] = useState<CancellationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}/cancellation-status`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json.data);
    } catch {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchStatus();

    // Poll for 30s then stop
    const interval = setInterval(() => {
      setPollCount((c) => {
        if (c >= 10) {
          clearInterval(interval);
          return c;
        }
        fetchStatus();
        return c + 1;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Memuat status pembatalan...</span>
      </div>
    );
  }

  if (!data || data.status !== 'CANCELLED') {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Success banner */}
      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5 text-xs text-red-700 dark:text-red-400">
        <CheckCircle2Icon className="h-4 w-4 text-red-500 shrink-0" />
        <div>
          <p className="font-medium">Kegiatan dibatalkan</p>
          {data.cancelledAt && (
            <p className="text-red-600 dark:text-red-500">
              {new Date(data.cancelledAt).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}
          {data.cancellationReason && (
            <p className="mt-0.5 text-red-500 dark:text-red-400 italic">
              &ldquo;{data.cancellationReason}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Notification failure warning */}
      {data.notificationFailedCount > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>{data.notificationFailedCount} notifikasi gagal dikirim.</strong>{' '}
            SC dapat melihat detail di dashboard monitoring.
          </span>
        </div>
      )}

      {/* Polling indicator */}
      {pollCount < 10 && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Memantau status notifikasi...</span>
        </div>
      )}
    </div>
  );
}
