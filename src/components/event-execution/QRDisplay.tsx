'use client';

/**
 * src/components/event-execution/QRDisplay.tsx
 * NAWASENA M08 — Live QR code display for OC attendance.
 *
 * - Shows QR PNG from API
 * - Countdown to expiry with auto-refresh
 * - Revoke + Regenerate buttons
 * - Short code fallback display
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { Loader2, RefreshCwIcon, XCircleIcon, QrCodeIcon, ClockIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface QRSession {
  id: string;
  shortCode: string;
  expiresAt: string;
  status: string;
}

interface QRDisplayProps {
  instanceId: string;
  instanceStatus: 'PLANNED' | 'RUNNING' | 'DONE' | 'CANCELLED';
}

export function QRDisplay({ instanceId, instanceStatus }: QRDisplayProps) {
  const [session, setSession] = useState<QRSession | null>(null);
  const [qrPng, setQrPng] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [countdown, setCountdown] = useState<string>('');

  const canManage = ['PLANNED', 'RUNNING'].includes(instanceStatus);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}/qr`);
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      if (data.data) {
        setSession(data.data.session);
        setQrPng(data.data.qrPngBase64);
      } else {
        setSession(null);
        setQrPng(null);
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  // Countdown timer
  useEffect(() => {
    if (!session?.expiresAt) return;
    const update = () => {
      const exp = new Date(session.expiresAt);
      if (exp <= new Date()) {
        setCountdown('Kadaluarsa');
        setSession(null);
        setQrPng(null);
        return;
      }
      setCountdown(formatDistanceToNow(exp, { addSuffix: false, locale: localeId }));
    };
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [session?.expiresAt]);

  const generateNew = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttlHours: 2 }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      setSession(data.data.session);
      setQrPng(data.data.qrPngBase64);
      toast.success('QR code baru berhasil dibuat!');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setGenerating(false);
    }
  };

  const revokeSession = async () => {
    if (!session) return;
    setRevoking(true);
    try {
      const res = await fetch(
        `/api/event-execution/instances/${instanceId}/qr/${session.id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'manual revoke by OC' }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      setSession(null);
      setQrPng(null);
      toast.success('QR code berhasil dinonaktifkan.');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
        QR hanya tersedia untuk sesi yang PLANNED atau RUNNING.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCodeIcon className="h-5 w-5 text-sky-500" />
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
            QR Absensi
          </span>
        </div>
        <div className="flex gap-2">
          {session && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={revokeSession}
              disabled={revoking}
              className="rounded-xl text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 h-8"
            >
              {revoking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircleIcon className="h-3.5 w-3.5" />
              )}
              <span className="ml-1 text-xs">Nonaktifkan</span>
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={generateNew}
            disabled={generating}
            className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white h-8"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCwIcon className="h-3.5 w-3.5" />
            )}
            <span className="ml-1 text-xs">
              {session ? 'Buat Baru' : 'Generate QR'}
            </span>
          </Button>
        </div>
      </div>

      {/* QR Code */}
      {session && qrPng ? (
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${qrPng}`}
            alt="QR Code Absensi"
            width={280}
            height={280}
            className="rounded-xl border border-sky-100 dark:border-sky-900 shadow"
          />

          {/* Short code fallback */}
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Kode manual (fallback)</p>
            <div className="inline-flex items-center gap-2 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl px-4 py-2">
              <span className="font-mono text-lg font-bold text-sky-700 dark:text-sky-300 tracking-widest">
                {session.shortCode}
              </span>
            </div>
          </div>

          {/* Expiry countdown */}
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <ClockIcon className="h-3.5 w-3.5" />
            <span>Berlaku {countdown}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <QrCodeIcon className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Belum ada QR aktif. Klik Generate QR untuk membuat baru.
          </p>
        </div>
      )}
    </div>
  );
}
