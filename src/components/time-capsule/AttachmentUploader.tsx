'use client';

/**
 * src/components/time-capsule/AttachmentUploader.tsx
 * NAWASENA M07 — Drag-and-drop attachment uploader with progress + retry.
 *
 * - Accepts image/* and audio/* up to 10MB, max 3 attachments per entry
 * - Uploads via presigned S3 PUT (from /api/time-capsule/upload-url)
 * - Confirms upload via /api/time-capsule/attachment-confirm
 * - 3x exponential backoff retry on S3 PUT failure
 * - Calls onUploadComplete with the confirmed attachment
 */

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { UploadCloudIcon, XIcon, Loader2, AlertCircleIcon, ImageIcon, MicIcon } from 'lucide-react';

const MIME_ALLOWLIST = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ATTACHMENTS = 3;
const MAX_RETRY = 3;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string): boolean {
  return mime.startsWith('image/');
}

function isAudio(mime: string): boolean {
  return mime.startsWith('audio/');
}

interface UploadedAttachment {
  id: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  storageKey: string;
}

interface AttachmentUploaderProps {
  entryId?: string;
  existingCount?: number;
  onUploadComplete: (attachment: UploadedAttachment) => void;
  disabled?: boolean;
  className?: string;
}

type UploadStatus = 'idle' | 'uploading' | 'confirming' | 'done' | 'error';

interface UploadItem {
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

async function putWithRetry(
  url: string,
  file: File,
  mime: string,
  onProgress: (pct: number) => void,
  attempt = 0,
): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', mime);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
        } else {
          reject(new Error(`S3 PUT failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('S3 network error'));
      xhr.send(file);
    });
  } catch (err) {
    if (attempt < MAX_RETRY - 1) {
      const delay = 1000 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      return putWithRetry(url, file, mime, onProgress, attempt + 1);
    }
    throw err;
  }
}

export function AttachmentUploader({
  entryId,
  existingCount = 0,
  onUploadComplete,
  disabled = false,
  className,
}: AttachmentUploaderProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_ATTACHMENTS - existingCount - uploads.filter((u) => u.status === 'done').length;

  const updateUpload = useCallback((index: number, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  }, []);

  const processFile = useCallback(
    async (file: File, index: number) => {
      // Client-side validation
      if (!MIME_ALLOWLIST.includes(file.type)) {
        updateUpload(index, {
          status: 'error',
          error: `Tipe file tidak diizinkan (${file.type})`,
        });
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        updateUpload(index, {
          status: 'error',
          error: `File terlalu besar (maks ${formatBytes(MAX_SIZE_BYTES)})`,
        });
        return;
      }

      try {
        // 1. Get presigned upload URL
        updateUpload(index, { status: 'uploading', progress: 0 });

        const urlRes = await fetch('/api/time-capsule/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entryId,
            filename: file.name,
            mime: file.type,
            size: file.size,
          }),
        });
        const urlJson = await urlRes.json();

        if (!urlJson.success) {
          const code = urlJson.error?.code ?? '';
          let msg = urlJson.error?.message ?? 'Gagal mendapatkan URL upload';
          if (code === 'ATTACHMENT_LIMIT_EXCEEDED') msg = 'Batas maksimal 3 lampiran sudah tercapai';
          if (code === 'ATTACHMENT_TOO_LARGE') msg = 'File terlalu besar (maks 10MB)';
          if (code === 'MIME_NOT_ALLOWED') msg = 'Tipe file tidak diizinkan';
          throw new Error(msg);
        }

        const { uploadUrl, storageKey } = urlJson.data as { uploadUrl: string; storageKey: string };

        // 2. PUT file to S3 with retry
        await putWithRetry(uploadUrl, file, file.type, (pct) => {
          updateUpload(index, { progress: pct });
        });

        // 3. Confirm upload
        updateUpload(index, { status: 'confirming', progress: 100 });

        const confirmRes = await fetch('/api/time-capsule/attachment-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entryId,
            storageKey,
            mime: file.type,
            size: file.size,
            originalFilename: file.name,
          }),
        });
        const confirmJson = await confirmRes.json();

        if (!confirmJson.success) {
          throw new Error(confirmJson.error?.message ?? 'Gagal mengkonfirmasi upload');
        }

        updateUpload(index, { status: 'done' });
        onUploadComplete(confirmJson.data as UploadedAttachment);
        toast.success(`${file.name} berhasil diupload`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload gagal';
        updateUpload(index, { status: 'error', error: msg });
        toast.error(msg);
      }
    },
    [entryId, onUploadComplete, updateUpload],
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      const canAdd = Math.min(fileArr.length, remaining);
      if (canAdd <= 0) {
        toast.error(`Batas maksimal ${MAX_ATTACHMENTS} lampiran sudah tercapai`);
        return;
      }

      const startIndex = uploads.length;
      const newItems: UploadItem[] = fileArr.slice(0, canAdd).map((f) => ({
        file: f,
        status: 'idle',
        progress: 0,
      }));

      setUploads((prev) => [...prev, ...newItems]);

      // Start processing each file
      newItems.forEach((_, idx) => {
        void processFile(fileArr[idx], startIndex + idx);
      });
    },
    [remaining, uploads.length, processFile],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || remaining <= 0) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, remaining, handleFiles],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = '';
      }
    },
    [handleFiles],
  );

  const removeUpload = useCallback((index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const isDisabled = disabled || remaining <= 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isDisabled && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 transition-all cursor-pointer',
          isDragging && !isDisabled
            ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20'
            : 'border-sky-200 dark:border-sky-800 hover:border-sky-400 dark:hover:border-sky-600',
          isDisabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <UploadCloudIcon className="h-8 w-8 text-sky-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isDisabled ? 'Batas lampiran tercapai' : 'Klik atau seret file ke sini'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Gambar (JPEG, PNG, WebP, GIF) atau Audio (MP3, M4A, AAC, OGG) · Maks 10MB · {remaining} slot tersisa
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={MIME_ALLOWLIST.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={isDisabled}
        />
      </div>

      {/* Upload progress list */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900"
            >
              {/* File icon */}
              <div className="shrink-0 text-gray-400">
                {isImage(upload.file.type) ? (
                  <ImageIcon className="h-4 w-4" />
                ) : isAudio(upload.file.type) ? (
                  <MicIcon className="h-4 w-4" />
                ) : (
                  <UploadCloudIcon className="h-4 w-4" />
                )}
              </div>

              {/* Filename + progress */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                  {upload.file.name}
                </p>
                {upload.status === 'error' ? (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                    <AlertCircleIcon className="h-3 w-3" />
                    {upload.error}
                  </p>
                ) : upload.status === 'done' ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Selesai · {formatBytes(upload.file.size)}
                  </p>
                ) : (
                  <>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {upload.status === 'confirming' ? 'Mengkonfirmasi...' : `${upload.progress}%`}
                    </p>
                  </>
                )}
              </div>

              {/* Status icon / remove */}
              <div className="shrink-0">
                {upload.status === 'uploading' || upload.status === 'confirming' ? (
                  <Loader2 className="h-4 w-4 text-sky-500 animate-spin" />
                ) : (
                  <button
                    type="button"
                    onClick={() => removeUpload(idx)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Hapus"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
