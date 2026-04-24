'use client';

/**
 * src/components/passport/FileEvidenceSubmit.tsx
 * NAWASENA M05 — PDF/Image file upload flow with presigned S3 URL.
 */

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';

interface FileEvidenceSubmitProps {
  itemId: string;
  itemName: string;
  previousEntryId?: string | null;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE_MB = 5;

export function FileEvidenceSubmit({ itemId, previousEntryId }: FileEvidenceSubmitProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mabaNotes, setMabaNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'submitting'>('idle');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Hanya file PDF, JPEG, atau PNG yang diperbolehkan.');
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Ukuran file melebihi ${MAX_SIZE_MB}MB.`);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Pilih file terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Get presigned upload URL
      setUploadProgress('uploading');
      const urlRes = await fetch('/api/passport/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          contentType: selectedFile.type,
          contentLength: selectedFile.size,
          filename: selectedFile.name,
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json();
        toast.apiError(err);
        setUploadProgress('idle');
        return;
      }

      const { data: { uploadUrl, s3Key } } = await urlRes.json();

      // Step 2: PUT file to S3
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': selectedFile.type },
      });

      if (!putRes.ok) {
        toast.error('Upload file gagal. Periksa koneksi internet Anda.');
        setUploadProgress('idle');
        return;
      }

      // Step 3: Submit entry
      setUploadProgress('submitting');
      const submitRes = await fetch('/api/passport/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          evidenceType: 'FILE',
          s3Key,
          mimeType: selectedFile.type,
          mabaNotes: mabaNotes.trim() || undefined,
          previousEntryId: previousEntryId ?? undefined,
        }),
      });

      if (!submitRes.ok) {
        const err = await submitRes.json();
        toast.apiError(err);
        setUploadProgress('idle');
        return;
      }

      toast.success('File bukti berhasil dikirim! Menunggu verifikasi.');
      router.push(`/dashboard/passport/${itemId}`);
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
      setUploadProgress('idle');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, itemId, mabaNotes, previousEntryId, router]);

  const progressLabel: Record<typeof uploadProgress, string> = {
    idle: 'Kirim File',
    uploading: 'Mengunggah file...',
    submitting: 'Mengirim pengajuan...',
  };

  const fileIcon = selectedFile?.type === 'application/pdf' ? '📄' : '🖼️';

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
        <p className="text-xs text-gray-700 dark:text-gray-300">
          <span className="font-semibold">Bukti File:</span> Unggah dokumen PDF atau gambar (JPEG/PNG).
          Maks. {MAX_SIZE_MB}MB.
        </p>
      </div>

      {/* File selector */}
      {selectedFile ? (
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-sky-200 dark:border-sky-800 p-3">
          <span className="text-2xl">{fileIcon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="text-red-500 hover:text-red-600 text-sm font-medium"
          >
            Hapus
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center gap-2 hover:border-sky-400 dark:hover:border-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/10 transition-colors"
        >
          <span className="text-3xl">📎</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Pilih File Dokumen
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            PDF, JPEG, PNG · Maks. {MAX_SIZE_MB}MB
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png"
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
        {progressLabel[uploadProgress]}
      </button>
    </div>
  );
}
