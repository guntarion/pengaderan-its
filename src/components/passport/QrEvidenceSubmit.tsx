'use client';

/**
 * src/components/passport/QrEvidenceSubmit.tsx
 * NAWASENA M05 — QR code scanner with BarcodeDetector API + @zxing/library fallback.
 *
 * Flow: open camera → scan QR → POST /api/passport/qr-validate → auto-VERIFIED
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';

interface QrEvidenceSubmitProps {
  itemId: string;
  itemName: string;
  previousEntryId?: string | null;
}

type ScanStep = 'idle' | 'scanning' | 'validating' | 'done' | 'error';

export function QrEvidenceSubmit({ itemId, previousEntryId }: QrEvidenceSubmitProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<ScanStep>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleQrResult = useCallback(
    async (rawValue: string) => {
      stopCamera();
      setStep('validating');

      try {
        const res = await fetch('/api/passport/qr-validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qrPayload: rawValue,
            itemId,
            previousEntryId: previousEntryId ?? undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          setErrorMsg(err?.error?.message ?? 'QR tidak valid atau sudah kadaluarsa.');
          setStep('error');
          return;
        }

        setStep('done');
        toast.success('QR berhasil discan! Item terverifikasi otomatis.');
        router.push(`/dashboard/passport/${itemId}`);
      } catch {
        setErrorMsg('Gagal memvalidasi QR. Periksa koneksi internet Anda.');
        setStep('error');
      }
    },
    [itemId, previousEntryId, router, stopCamera],
  );

  const startBarcodeDetector = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_stream: MediaStream) => {
      if (!('BarcodeDetector' in window)) return false;

      try {
        // @ts-expect-error -- BarcodeDetector experimental API not in TS lib
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const video = videoRef.current;
        if (!video) return false;

        let active = true;

        const scan = async () => {
          if (!active || !streamRef.current) return;
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              active = false;
              await handleQrResult(barcodes[0].rawValue);
              return;
            }
          } catch {
            // Continue scanning
          }
          requestAnimationFrame(scan);
        };

        requestAnimationFrame(scan);
        return true;
      } catch {
        return false;
      }
    },
    [handleQrResult],
  );

  const startZxingFallback = useCallback(
    async (stream: MediaStream) => {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/library');
        const reader = new BrowserQRCodeReader();
        const video = videoRef.current;
        if (!video) return;

        reader.decodeFromStream(stream, video, (result) => {
          if (result && streamRef.current) {
            handleQrResult(result.getText());
          }
        });
      } catch {
        setErrorMsg('Kamera tidak mendukung scan QR. Coba browser lain.');
        setStep('error');
        stopCamera();
      }
    },
    [handleQrResult, stopCamera],
  );

  const openCamera = useCallback(async () => {
    setStep('scanning');
    setErrorMsg('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsCameraOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Try BarcodeDetector first (Chrome/Edge/Android); fallback to @zxing (Safari/Firefox)
      const detectorReady = await startBarcodeDetector(stream);
      if (!detectorReady) {
        await startZxingFallback(stream);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Aktifkan kamera di pengaturan browser.'
          : 'Tidak dapat mengakses kamera.';
      setErrorMsg(msg);
      setStep('error');
    }
  }, [startBarcodeDetector, startZxingFallback]);

  return (
    <div className="space-y-4">
      <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-3">
        <p className="text-xs text-sky-700 dark:text-sky-300">
          <span className="font-semibold">Bukti QR Scan:</span> Scan QR code yang ditampilkan oleh
          panitia / verifikator. Item akan terverifikasi secara otomatis.
        </p>
      </div>

      {/* Camera viewport */}
      {isCameraOpen && (
        <div className="relative rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full max-h-72 object-cover"
            playsInline
            muted
          />
          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-4 border-sky-400 rounded-2xl opacity-70" />
          </div>
          <button
            type="button"
            onClick={stopCamera}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full px-3 py-1 text-xs font-medium hover:bg-black/80"
          >
            Tutup
          </button>
          <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/80">
            Arahkan kamera ke QR Code...
          </p>
        </div>
      )}

      {/* States */}
      {step === 'idle' && !isCameraOpen && (
        <button
          type="button"
          onClick={openCamera}
          className="w-full py-4 rounded-xl border-2 border-dashed border-sky-300 dark:border-sky-700 flex flex-col items-center gap-2 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
        >
          <span className="text-3xl">📷</span>
          <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">Buka Kamera untuk Scan QR</span>
        </button>
      )}

      {step === 'validating' && (
        <div className="flex items-center justify-center gap-3 py-6 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800">
          <div className="h-5 w-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-sky-700 dark:text-sky-300 font-medium">Memvalidasi QR...</p>
        </div>
      )}

      {step === 'error' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">Scan Gagal</p>
          <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
          <button
            type="button"
            onClick={() => {
              setStep('idle');
              setErrorMsg('');
            }}
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="flex items-center gap-2 py-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl justify-center">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
            ✓ Terverifikasi
          </span>
        </div>
      )}
    </div>
  );
}
