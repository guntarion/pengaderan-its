'use client';

/**
 * src/components/passport/PhotoEvidenceSubmit.tsx
 * NAWASENA M05 — Camera capture + client-side compress + presigned upload.
 *
 * Flow: capture → compress (browser-image-compression) → getUploadUrl → PUT S3 → POST /api/passport/submit
 */

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { toast } from '@/lib/toast';

interface PhotoEvidenceSubmitProps {
  itemId: string;
  itemName: string;
  previousEntryId?: string | null;
}

type SubmitStep = 'idle' | 'capturing' | 'compressing' | 'uploading' | 'submitting' | 'done';

export function PhotoEvidenceSubmit({ itemId, previousEntryId }: PhotoEvidenceSubmitProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<SubmitStep>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mabaNotes, setMabaNotes] = useState('');

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Hanya file JPEG atau PNG yang diperbolehkan.');
      return;
    }

    setStep('compressing');
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg',
      });
      setSelectedFile(compressed);
      const url = URL.createObjectURL(compressed);
      setPreview(url);
      setStep('idle');
    } catch {
      toast.error('Gagal mengompres foto. Coba lagi.');
      setStep('idle');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Pilih foto terlebih dahulu.');
      return;
    }

    try {
      // Step 1: Get presigned upload URL
      setStep('uploading');
      const urlRes = await fetch('/api/passport/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          contentType: 'image/jpeg',
          contentLength: selectedFile.size,
          filename: `photo_${Date.now()}.jpg`,
        }),
      });
      if (!urlRes.ok) {
        const err = await urlRes.json();
        toast.apiError(err);
        setStep('idle');
        return;
      }
      const { data: { uploadUrl, s3Key } } = await urlRes.json();

      // Step 2: PUT file to S3
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': 'image/jpeg' },
      });
      if (!putRes.ok) {
        toast.error('Upload foto gagal. Periksa koneksi internet Anda.');
        setStep('idle');
        return;
      }

      // Step 3: Submit entry
      setStep('submitting');
      const submitRes = await fetch('/api/passport/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          evidenceType: 'FOTO',
          s3Key,
          mimeType: 'image/jpeg',
          mabaNotes: mabaNotes.trim() || undefined,
          previousEntryId: previousEntryId ?? undefined,
        }),
      });

      if (!submitRes.ok) {
        const err = await submitRes.json();
        toast.apiError(err);
        setStep('idle');
        return;
      }

      setStep('done');
      toast.success('Bukti foto berhasil dikirim! Menunggu verifikasi.');
      router.push(`/dashboard/passport/${itemId}`);
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
      setStep('idle');
    }
  }, [selectedFile, itemId, mabaNotes, previousEntryId, router]);

  const isLoading = ['compressing', 'uploading', 'submitting'].includes(step);

  const stepLabel: Record<SubmitStep, string> = {
    idle: 'Kirim Bukti',
    capturing: 'Membuka kamera...',
    compressing: 'Mengompres foto...',
    uploading: 'Mengunggah foto...',
    submitting: 'Mengirim pengajuan...',
    done: 'Selesai',
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <span className="font-semibold">Bukti Foto:</span> Ambil foto langsung dari kamera atau
          pilih dari galeri. Foto akan dikompres otomatis.
        </p>
      </div>

      {/* Photo preview / upload area */}
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-80 object-contain rounded-xl border border-sky-100 dark:border-sky-900"
          />
          <button
            onClick={() => {
              setPreview(null);
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold hover:bg-red-600"
            type="button"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-sky-300 dark:border-sky-700 rounded-xl p-8 flex flex-col items-center gap-2 hover:border-sky-500 dark:hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
        >
          <span className="text-3xl">📷</span>
          <span className="text-sm font-medium text-sky-700 dark:text-sky-300">Ambil Foto / Pilih dari Galeri</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Maks. 5MB · JPEG atau PNG</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Catatan (opsional)
        </label>
        <textarea
          value={mabaNotes}
          onChange={(e) => setMabaNotes(e.target.value)}
          rows={2}
          placeholder="Tambahkan keterangan jika diperlukan..."
          className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedFile || isLoading}
        className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 dark:disabled:bg-sky-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {isLoading && (
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {stepLabel[step]}
      </button>
    </div>
  );
}
