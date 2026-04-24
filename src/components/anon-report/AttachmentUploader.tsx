'use client';

/**
 * src/components/anon-report/AttachmentUploader.tsx
 * NAWASENA M12 — Drag-drop attachment uploader for anonymous report form.
 *
 * MIME whitelist: image/jpeg, image/png, application/pdf (max 5MB).
 * Client-side MIME check before presign call.
 * Calls presign API → uploads to S3 → calls back with attachmentTmpKey.
 */

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface AttachmentUploaderProps {
  captchaToken?: string;
  onUploaded: (tmpKey: string) => void;
  onCleared: () => void;
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

export function AttachmentUploader({
  captchaToken,
  onUploaded,
  onCleared,
}: AttachmentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_MIMES.includes(f.type)) {
      return 'Tipe file tidak didukung. Gunakan JPEG, PNG, atau PDF.';
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File terlalu besar. Maksimal ${MAX_FILE_SIZE / 1024 / 1024} MB.`;
    }
    return null;
  };

  const handleFile = async (f: File) => {
    const err = validateFile(f);
    if (err) {
      toast.error(err);
      return;
    }

    setFile(f);
    setUploadState('uploading');
    setProgress(10);

    try {
      // Step 1: Get presigned URL
      const presignRes = await fetch('/api/anon-reports/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: f.name,
          mimeType: f.type,
          captchaToken: captchaToken ?? 'skip', // captcha required by API
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok || !presignData.success) {
        throw new Error(presignData.error?.message ?? 'Gagal mendapatkan URL upload');
      }

      setProgress(40);

      const { presignUrl, tmpKey } = presignData.data;

      // Step 2: Upload directly to S3
      const uploadRes = await fetch(presignUrl, {
        method: 'PUT',
        headers: { 'Content-Type': f.type },
        body: f,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload ke server gagal');
      }

      setProgress(100);
      setUploadState('done');
      onUploaded(tmpKey);
      toast.success('Berkas berhasil diunggah');
    } catch (err) {
      setUploadState('error');
      setProgress(0);
      toast.apiError(err);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) void handleFile(dropped);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) void handleFile(selected);
  };

  const handleClear = () => {
    setFile(null);
    setUploadState('idle');
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
    onCleared();
  };

  const FileIcon = file?.type === 'application/pdf' ? FileText : Image;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Lampiran (opsional) — JPEG, PNG, PDF, maks. 5 MB
      </p>

      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 transition-colors ${
            isDragOver
              ? 'border-sky-400 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/20'
              : 'border-gray-200 hover:border-sky-300 hover:bg-sky-50/50 dark:border-gray-700 dark:hover:border-sky-700'
          }`}
        >
          <Upload className="mb-2 h-6 w-6 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Seret berkas ke sini atau{' '}
            <span className="text-sky-600 dark:text-sky-400">klik untuk memilih</span>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <FileIcon className="h-5 w-5 shrink-0 text-sky-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
              {file.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            {uploadState === 'uploading' && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {uploadState === 'uploading' && (
              <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
            )}
            {uploadState === 'done' && (
              <span className="text-xs text-green-600 dark:text-green-400">Berhasil</span>
            )}
            {uploadState === 'error' && (
              <span className="text-xs text-red-500">Gagal</span>
            )}
            <button
              onClick={handleClear}
              type="button"
              className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
