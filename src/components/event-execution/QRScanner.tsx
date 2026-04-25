'use client';

/**
 * src/components/event-execution/QRScanner.tsx
 * NAWASENA M08 — QR Camera scanner for Maba attendance.
 *
 * - Uses BarcodeDetector Web API (Chrome 83+ / Edge 83+ / Safari 17.4+)
 * - Falls back to manual code entry (shortCode)
 * - Online: POST /api/attendance/stamp immediately
 * - Offline: enqueue to IndexedDB for background sync
 * - Generates clientScanId for idempotency
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { Loader2, CameraIcon, KeyboardIcon, CheckCircle2Icon, WifiOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ScanMode = 'camera' | 'manual';
type ScanState = 'idle' | 'scanning' | 'success' | 'error';

interface QRScannerProps {
  onSuccess?: (attendanceId: string, isWalkin: boolean) => void;
  onOfflineQueue?: (clientScanId: string) => void;
}

/** Generate UUID v4 for clientScanId */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Check if BarcodeDetector is available */
function isBarcodeDetectorAvailable(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export function QRScanner({ onSuccess, onOfflineQueue }: QRScannerProps) {
  const [mode, setMode] = useState<ScanMode>('camera');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [isOnline, setIsOnline] = useState(true);
  const [shortCodeInput, setShortCodeInput] = useState('');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [hasBarcodeDetector] = useState(isBarcodeDetectorAvailable);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);

  // Online status tracking
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

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const processQRPayload = useCallback(
    async (qrPayload: string) => {
      const clientScanId = generateUUID();
      const scannedAt = new Date().toISOString();

      if (!isOnline) {
        // Enqueue offline
        const { enqueueStamp } = await import('@/lib/event-execution/idb/attendance-queue');
        await enqueueStamp({
          id: clientScanId,
          qrPayload,
          clientScanId,
          scannedAt,
          queuedAt: Date.now(),
          attempts: 0,
        });
        setScanState('success');
        onOfflineQueue?.(clientScanId);
        toast.success('Scan tersimpan offline. Akan dikirim saat online.');
        processingRef.current = false;
        stopCamera();
        return;
      }

      // Online — submit directly
      try {
        const res = await fetch('/api/attendance/stamp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrPayload, clientScanId, scannedAt }),
        });
        const data = await res.json();

        if (!res.ok) {
          setScanState('error');
          toast.apiError(data);
          processingRef.current = false;
          return;
        }

        if (data.data?.ok === false) {
          setScanState('error');
          toast.error(data.data.message ?? 'Gagal memproses scan.');
          processingRef.current = false;
          return;
        }

        setScanState('success');
        toast.success(data.data?.message ?? 'Kehadiran berhasil dicatat!');
        onSuccess?.(data.data?.attendanceId, data.data?.isWalkin);
        stopCamera();
      } catch (err) {
        setScanState('error');
        toast.apiError(err);
        processingRef.current = false;
      }
    },
    [isOnline, onSuccess, onOfflineQueue, stopCamera],
  );

  const startScanLoop = useCallback(() => {
    if (!hasBarcodeDetector) return;

    // @ts-expect-error — BarcodeDetector not in TS lib yet
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    scanIntervalRef.current = setInterval(async () => {
      if (processingRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);

      try {
        const codes = await detector.detect(canvas);
        if (codes.length > 0) {
          const qrPayload = codes[0].rawValue;
          if (qrPayload) {
            processingRef.current = true;
            await processQRPayload(qrPayload);
          }
        }
      } catch {
        // Silently ignore detection errors
      }
    }, 500);
  }, [hasBarcodeDetector, processQRPayload]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setCameraPermission('granted');
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanState('scanning');
      startScanLoop();
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setCameraPermission('denied');
      }
      toast.apiError(err);
    }
  }, [startScanLoop]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = shortCodeInput.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error('Kode harus 6 karakter.');
      return;
    }
    // For manual code, construct a lookup URL that the server can handle
    // We send the short code as qrPayload with shortCode prefix
    const qrPayload = `nawasena://attendance/shortcode/${code}`;
    await processQRPayload(qrPayload);
  };

  const handleSwitchMode = (newMode: ScanMode) => {
    stopCamera();
    setScanState('idle');
    processingRef.current = false;
    setMode(newMode);
  };

  const handleRetry = () => {
    setScanState('idle');
    processingRef.current = false;
    if (mode === 'camera') {
      startCamera();
    }
  };

  return (
    <div className="space-y-4">
      {/* Online/offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <WifiOffIcon className="h-4 w-4 shrink-0" />
          <span>Mode offline — scan akan disimpan dan dikirim saat online.</span>
        </div>
      )}

      {/* Mode switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleSwitchMode('camera')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
            mode === 'camera'
              ? 'bg-sky-500 text-white border-sky-500'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-sky-300'
          }`}
        >
          <CameraIcon className="h-3.5 w-3.5" /> Scan Kamera
        </button>
        <button
          type="button"
          onClick={() => handleSwitchMode('manual')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
            mode === 'manual'
              ? 'bg-sky-500 text-white border-sky-500'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-sky-300'
          }`}
        >
          <KeyboardIcon className="h-3.5 w-3.5" /> Kode Manual
        </button>
      </div>

      {/* Camera mode */}
      {mode === 'camera' && (
        <div className="space-y-3">
          {!hasBarcodeDetector && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              Browser tidak mendukung BarcodeDetector. Gunakan Chrome/Edge terbaru atau gunakan kode manual.
            </div>
          )}

          {hasBarcodeDetector && cameraPermission === 'denied' && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-xs text-red-700 dark:text-red-400">
              Akses kamera ditolak. Izinkan kamera di pengaturan browser lalu muat ulang halaman.
            </div>
          )}

          {scanState === 'idle' && hasBarcodeDetector && cameraPermission !== 'denied' && (
            <Button
              type="button"
              onClick={startCamera}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
            >
              <CameraIcon className="mr-2 h-4 w-4" /> Buka Kamera
            </Button>
          )}

          {scanState === 'scanning' && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-w-sm mx-auto">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/70 rounded-lg" />
              </div>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                  Arahkan kamera ke QR code
                </span>
              </div>
            </div>
          )}

          {scanState === 'success' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2Icon className="h-16 w-16 text-green-500" />
              <p className="font-semibold text-green-700 dark:text-green-400">Kehadiran tercatat!</p>
              <Button type="button" onClick={handleRetry} variant="outline" className="rounded-xl">
                Scan Lagi
              </Button>
            </div>
          )}

          {scanState === 'error' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">Gagal memproses QR. Coba scan lagi.</p>
              <Button type="button" onClick={handleRetry} className="rounded-xl bg-sky-500 text-white">
                Coba Lagi
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              Kode Manual (6 karakter)
            </Label>
            <Input
              value={shortCodeInput}
              onChange={(e) => setShortCodeInput(e.target.value.toUpperCase())}
              placeholder="Contoh: A1B2C3"
              maxLength={6}
              className="rounded-xl border-gray-200 dark:border-gray-700 font-mono text-center text-lg tracking-widest"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Minta kode 6 karakter dari OC.
            </p>
          </div>

          <Button
            type="submit"
            disabled={shortCodeInput.length !== 6 || scanState === 'scanning'}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
          >
            {scanState === 'scanning' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Konfirmasi Kehadiran
          </Button>

          {scanState === 'success' && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2Icon className="h-4 w-4 shrink-0" />
              Kehadiran berhasil dicatat!
            </div>
          )}
        </form>
      )}
    </div>
  );
}
