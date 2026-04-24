'use client';

/**
 * src/components/safeguard/IncidentAttachmentList.tsx
 * NAWASENA M10 — Upload card + attachment list for incident detail.
 *
 * Upload flow:
 *   1. User selects file
 *   2. POST /api/safeguard/incidents/[id]/attachments/presign → { uploadUrl, s3Key }
 *   3. PUT directly to S3 uploadUrl
 *   4. POST /api/safeguard/incidents/[id]/attachments/confirm { s3Key } → confirmed
 *
 * Download flow:
 *   GET /api/safeguard/incidents/[id]/attachments/[encodedKey] → { url }
 *   Opens presigned URL in new tab.
 *
 * Upload is only shown for roles: SC, KP, OC (canUpload prop).
 * PEMBINA sees list only (no upload).
 */

import { useState, useRef } from 'react';
import { Paperclip, Upload, Download, FileText, Image, Loader2, X } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('incident-attachment-list');

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.pdf';

export interface AttachmentInfo {
  s3Key: string;
  fileName?: string;
}

export interface IncidentAttachmentListProps {
  incidentId: string;
  attachmentKeys: string[];
  canUpload: boolean;
  onUploaded?: () => void; // triggers parent re-fetch after successful upload
}

function mimeIcon(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith('.pdf')) return <FileText className="h-4 w-4 text-red-400" />;
  if (lower.match(/\.(jpg|jpeg|png|webp)$/)) return <Image className="h-4 w-4 text-sky-400" />;
  return <Paperclip className="h-4 w-4 text-gray-400" />;
}

function keyToDisplayName(key: string): string {
  // key format: safeguard/incidents/{id}/{timestamp}-{random}.{ext}
  const parts = key.split('/');
  return parts[parts.length - 1] ?? key;
}

export function IncidentAttachmentList({
  incidentId,
  attachmentKeys,
  canUpload,
  onUploaded,
}: IncidentAttachmentListProps) {
  const [uploading, setUploading] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter out PENDING: prefixed keys (pending uploads not yet confirmed)
  const confirmedKeys = attachmentKeys.filter((k) => !k.startsWith('PENDING:'));

  async function uploadFile(file: File) {
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error('Tipe file tidak didukung. Gunakan JPEG, PNG, WEBP, atau PDF.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Ukuran file maksimal 5 MB');
      return;
    }
    if (confirmedKeys.length >= 3) {
      toast.error('Maksimal 3 lampiran per insiden');
      return;
    }

    setUploading(true);
    log.info('Starting attachment upload', { incidentId, fileName: file.name, size: file.size });

    try {
      // Step 1: Presign
      const presignRes = await fetch(`/api/safeguard/incidents/${incidentId}/attachments/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? 'Gagal mendapatkan URL upload');
      }

      const { data: presignData } = await presignRes.json();
      const { uploadUrl, s3Key } = presignData;

      // Step 2: Upload to S3
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error('Upload ke storage gagal');
      }

      // Step 3: Confirm
      const confirmRes = await fetch(`/api/safeguard/incidents/${incidentId}/attachments/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key }),
      });

      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? 'Gagal mengkonfirmasi upload');
      }

      log.info('Attachment uploaded successfully', { incidentId, s3Key });
      toast.success('Lampiran berhasil diunggah');
      onUploaded?.();
    } catch (err) {
      log.error('Attachment upload failed', { incidentId, error: err });
      toast.apiError(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDownload(s3Key: string) {
    setDownloadingKey(s3Key);
    try {
      const encodedKey = encodeURIComponent(s3Key);
      const res = await fetch(`/api/safeguard/incidents/${incidentId}/attachments/${encodedKey}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? 'Gagal mendapatkan URL download');
      }

      const { data } = await res.json();
      window.open(data.url, '_blank', 'noopener,noreferrer');
      log.info('Attachment download initiated', { incidentId, s3Key });
    } catch (err) {
      log.error('Attachment download failed', { incidentId, s3Key, error: err });
      toast.apiError(err);
    } finally {
      setDownloadingKey(null);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="space-y-3">
      {/* Upload area (only shown if canUpload) */}
      {canUpload && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            'border-2 border-dashed rounded-2xl p-4 text-center transition-colors cursor-pointer',
            dragOver
              ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20'
              : 'border-sky-100 dark:border-sky-800 hover:border-sky-300 dark:hover:border-sky-600',
            uploading ? 'opacity-50 pointer-events-none' : '',
          ].join(' ')}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS}
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                <p className="text-xs text-sky-600 dark:text-sky-400">Mengunggah...</p>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-sky-400" />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Klik atau drag file ke sini
                </p>
                <p className="text-xs text-gray-400">
                  JPEG, PNG, WEBP, PDF · Maks. 5 MB · Maks. 3 lampiran
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Attachment list */}
      {confirmedKeys.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">
          Belum ada lampiran
        </p>
      ) : (
        <div className="space-y-2">
          {confirmedKeys.map((key) => {
            const isDownloading = downloadingKey === key;
            return (
              <div
                key={key}
                className="flex items-center gap-3 p-3 rounded-xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-slate-800"
              >
                <div className="flex-shrink-0">{mimeIcon(key)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {keyToDisplayName(key)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{key}</p>
                </div>
                <button
                  onClick={() => handleDownload(key)}
                  disabled={isDownloading}
                  title="Unduh lampiran"
                  className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 disabled:opacity-50 transition-colors"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {canUpload && confirmedKeys.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {confirmedKeys.length}/3 lampiran
        </p>
      )}
    </div>
  );
}
