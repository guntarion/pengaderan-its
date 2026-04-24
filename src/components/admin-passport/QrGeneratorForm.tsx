'use client';

/**
 * src/components/admin-passport/QrGeneratorForm.tsx
 * NAWASENA M05 — Admin form to create QR session + renders QR image for printing.
 */

import { useState, useCallback } from 'react';
import { toast } from '@/lib/toast';

interface PassportItemOption {
  id: string;
  namaItem: string;
  dimensi: string;
}

interface QrSession {
  id: string;
  itemId: string;
  eventName: string;
  expiresAt: string;
  maxScans: number;
  scanCount: number;
  qrUrl: string;
}

interface QrGeneratorFormProps {
  items: PassportItemOption[];
  onSessionCreated?: (session: QrSession) => void;
}

export function QrGeneratorForm({ items, onSessionCreated }: QrGeneratorFormProps) {
  const [itemId, setItemId] = useState('');
  const [eventName, setEventName] = useState('');
  const [ttlMinutes, setTtlMinutes] = useState(60);
  const [maxScans, setMaxScans] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [createdSession, setCreatedSession] = useState<QrSession | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!itemId || !eventName.trim()) {
      toast.error('Pilih item dan isi nama event terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/passport/qr-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          eventName: eventName.trim(),
          ttlMinutes,
          maxScans,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.apiError(err);
        return;
      }

      const { data } = await res.json();
      setCreatedSession(data);
      onSessionCreated?.(data);

      // Generate QR code image on client using qrcode library
      const qrcode = await import('qrcode');
      const dataUrl = await qrcode.toDataURL(data.qrUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#0ea5e9', light: '#ffffff' },
      });
      setQrImageUrl(dataUrl);

      toast.success('QR Session berhasil dibuat!');
    } catch {
      toast.error('Gagal membuat QR Session.');
    } finally {
      setIsLoading(false);
    }
  }, [itemId, eventName, ttlMinutes, maxScans, onSessionCreated]);

  const handlePrint = () => {
    if (!qrImageUrl || !createdSession) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>QR Passport — ${createdSession.eventName}</title></head>
        <body style="text-align:center;font-family:sans-serif;padding:40px">
          <h1 style="font-size:18px;margin-bottom:8px">Scan QR untuk Verifikasi Passport</h1>
          <p style="font-size:14px;color:#666;margin-bottom:16px">${createdSession.eventName}</p>
          <img src="${qrImageUrl}" width="280" height="280" />
          <p style="font-size:12px;color:#999;margin-top:12px">
            Berlaku hingga: ${new Date(createdSession.expiresAt).toLocaleString('id-ID')}
          </p>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-5">
      {/* Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Generate QR Session Baru
        </h3>

        <div className="space-y-3">
          {/* Item selector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Item Passport <span className="text-red-500">*</span>
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">-- Pilih Item --</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.dimensi}] {item.namaItem}
                </option>
              ))}
            </select>
          </div>

          {/* Event name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Event / Kegiatan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Contoh: Workshop Karir 2026"
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* TTL */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Berlaku (menit)
              </label>
              <select
                value={ttlMinutes}
                onChange={(e) => setTtlMinutes(Number(e.target.value))}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value={30}>30 menit</option>
                <option value={60}>1 jam</option>
                <option value={120}>2 jam</option>
                <option value={240}>4 jam</option>
                <option value={480}>8 jam</option>
                <option value={1440}>24 jam</option>
              </select>
            </div>

            {/* Max scans */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maks. Scan
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={maxScans}
                onChange={(e) => setMaxScans(Number(e.target.value))}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !itemId || !eventName.trim()}
            className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 dark:disabled:bg-sky-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Generate QR Code
          </button>
        </div>
      </div>

      {/* QR result */}
      {qrImageUrl && createdSession && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-100 dark:border-emerald-900 p-5 text-center">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            QR Code Siap
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageUrl}
            alt="QR Code"
            className="mx-auto w-52 h-52 rounded-xl"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {createdSession.eventName} · Berlaku hingga{' '}
            {new Date(createdSession.expiresAt).toLocaleString('id-ID')}
          </p>
          <div className="flex gap-2 mt-4 justify-center">
            <button
              type="button"
              onClick={handlePrint}
              className="text-sm px-4 py-2 rounded-xl border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors font-medium"
            >
              Cetak QR
            </button>
            <a
              href={qrImageUrl}
              download={`qr-${createdSession.id}.png`}
              className="text-sm px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-colors font-medium"
            >
              Unduh PNG
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
