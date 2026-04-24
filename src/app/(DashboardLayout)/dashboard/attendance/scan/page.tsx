'use client';

/**
 * src/app/(DashboardLayout)/dashboard/attendance/scan/page.tsx
 * NAWASENA M08 — Maba QR Attendance Scan PWA page.
 *
 * - Opens camera for QR scan or accepts manual shortCode
 * - Offline-first: queues scans to IndexedDB, auto-syncs when online
 * - Shows pending sync count + Force Sync button
 * - Roles: all authenticated (primary: MABA)
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { QRScanner } from '@/components/event-execution/QRScanner';
import { toast } from '@/lib/toast';
import { QrCodeIcon, RefreshCwIcon, Loader2, WifiIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ScanPageContent() {
  const searchParams = useSearchParams();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Auto-scan from QR redirect (GET /api/attendance/stamp?qr=...)
  // Reserved for future use — deep-link auto-scan from browser QR camera
  void searchParams.get('qr');

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      const { getQueueSize } = await import('@/lib/event-execution/idb/attendance-queue');
      const size = await getQueueSize();
      setPendingCount(size);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 10_000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      handleForceSync();
    }
  }, [isOnline]);

  const handleForceSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { getAllQueued, removeFromQueue, updateAttempts } = await import(
        '@/lib/event-execution/idb/attendance-queue'
      );
      const queue = await getAllQueued();
      if (queue.length === 0) {
        setSyncing(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of queue) {
        try {
          const res = await fetch('/api/attendance/stamp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              qrPayload: item.qrPayload,
              clientScanId: item.clientScanId,
              scannedAt: item.scannedAt,
              scanLocation: item.scanLocation,
            }),
          });
          const data = await res.json();

          if (res.ok && data.data?.ok !== false) {
            await removeFromQueue(item.id);
            successCount++;
          } else {
            const newAttempts = item.attempts + 1;
            if (newAttempts >= 5) {
              // Give up after 5 attempts
              await removeFromQueue(item.id);
              failCount++;
            } else {
              await updateAttempts(item.id, newAttempts, data?.error?.message);
            }
          }
        } catch {
          await updateAttempts(item.id, item.attempts + 1, 'Network error');
          failCount++;
        }
      }

      await refreshPendingCount();

      if (successCount > 0) {
        toast.success(`${successCount} kehadiran berhasil disinkron.`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} kehadiran gagal disinkron.`);
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-md">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            className="text-white/70 mb-3 text-sm"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCodeIcon className="h-6 w-6" />
              <h1 className="text-xl font-bold">Scan Kehadiran</h1>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingCount} pending
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleForceSync}
                  disabled={syncing || !isOnline}
                  className="h-7 rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs"
                >
                  {syncing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="h-3 w-3" />
                  )}
                  <span className="ml-1">Sync</span>
                </Button>
              </div>
            )}
          </div>
          <p className="text-sm text-white/80 mt-1">
            Scan QR code dari OC atau masukkan kode manual
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto max-w-md px-4 py-6">
        {/* Online status bar */}
        <div
          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl mb-4 ${
            isOnline
              ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
          }`}
        >
          <WifiIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{isOnline ? 'Terhubung ke internet' : 'Mode offline — scan akan disimpan lokal'}</span>
        </div>

        {/* Scanner card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <QRScanner
            onSuccess={() => {
              refreshPendingCount();
            }}
            onOfflineQueue={() => {
              refreshPendingCount();
            }}
          />
        </div>

        {/* Sync status */}
        {pendingCount > 0 && (
          <div className="mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {pendingCount} scan menunggu sinkronisasi
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Akan otomatis dikirim saat perangkat terhubung ke internet.
            </p>
            <Button
              type="button"
              onClick={handleForceSync}
              disabled={syncing || !isOnline}
              className="mt-3 h-8 text-xs rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
            >
              {syncing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Sinkron Sekarang
            </Button>
          </div>
        )}

        {/* Info box */}
        <div className="mt-4 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-sky-700 dark:text-sky-300 mb-2">Panduan Scan</p>
          <ul className="space-y-1.5 text-xs text-sky-600 dark:text-sky-400">
            <li>1. Klik &quot;Buka Kamera&quot; dan izinkan akses kamera</li>
            <li>2. Arahkan kamera ke QR code di layar OC</li>
            <li>3. Tunggu konfirmasi kehadiran muncul</li>
            <li>4. Jika tidak bisa scan, gunakan &quot;Kode Manual&quot; dari OC</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function AttendanceScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    }>
      <ScanPageContent />
    </Suspense>
  );
}
