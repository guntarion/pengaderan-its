'use client';

/**
 * src/components/time-capsule/AttachmentGallery.tsx
 * NAWASENA M07 — Renders attachment thumbnails (images inline, audio with player).
 *
 * Downloads via /api/time-capsule/attachment/:id/download which issues
 * a short-lived presigned GET URL. Falls back to loading state while URL resolves.
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MicIcon, Loader2, AlertCircleIcon, DownloadIcon } from 'lucide-react';
import Image from 'next/image';

interface AttachmentMeta {
  id: string;
  originalFilename: string;
  mimeType: string;
  size: number;
}

interface ResolvedAttachment extends AttachmentMeta {
  url: string | null;
  loading: boolean;
  error: boolean;
}

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

async function fetchDownloadUrl(attachmentId: string): Promise<string> {
  const res = await fetch(`/api/time-capsule/attachment/${attachmentId}/download`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Gagal mendapatkan URL download');
  return json.data.url as string;
}

interface AttachmentItemProps {
  attachment: ResolvedAttachment;
  readonly?: boolean;
}

function AttachmentItem({ attachment, readonly = false }: AttachmentItemProps) {
  if (attachment.loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900">
        <Loader2 className="h-4 w-4 text-sky-400 animate-spin shrink-0" />
        <span className="text-xs text-gray-500 truncate">{attachment.originalFilename}</span>
      </div>
    );
  }

  if (attachment.error || !attachment.url) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-800">
        <AlertCircleIcon className="h-4 w-4 text-red-400 shrink-0" />
        <span className="text-xs text-red-500 truncate">{attachment.originalFilename}</span>
        <span className="text-xs text-gray-400 ml-auto shrink-0">{formatBytes(attachment.size)}</span>
      </div>
    );
  }

  // Image — render inline
  if (isImage(attachment.mimeType)) {
    return (
      <div className="rounded-xl overflow-hidden border border-sky-100 dark:border-sky-900 bg-white dark:bg-slate-800">
        <div className="relative w-full aspect-video bg-gray-50 dark:bg-slate-900">
          <Image
            src={attachment.url}
            alt={attachment.originalFilename}
            fill
            className="object-contain"
            unoptimized // presigned URLs are external
          />
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-sky-100 dark:border-sky-900">
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {attachment.originalFilename}
          </span>
          {!readonly && (
            <a
              href={attachment.url}
              download={attachment.originalFilename}
              className="text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1 shrink-0 ml-2 hover:underline"
            >
              <DownloadIcon className="h-3 w-3" />
              Unduh
            </a>
          )}
        </div>
      </div>
    );
  }

  // Audio — native player
  if (isAudio(attachment.mimeType)) {
    return (
      <div className="px-3 py-3 bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900 space-y-2">
        <div className="flex items-center gap-2">
          <MicIcon className="h-4 w-4 text-sky-400 shrink-0" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
            {attachment.originalFilename}
          </span>
          <span className="text-xs text-gray-400 ml-auto shrink-0">{formatBytes(attachment.size)}</span>
        </div>
        <audio
          src={attachment.url}
          controls
          className="w-full h-10"
          preload="metadata"
        />
      </div>
    );
  }

  // Fallback — download link
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900">
      <DownloadIcon className="h-4 w-4 text-gray-400 shrink-0" />
      <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
        {attachment.originalFilename}
      </span>
      <span className="text-xs text-gray-400 shrink-0">{formatBytes(attachment.size)}</span>
      {!readonly && (
        <a
          href={attachment.url}
          download={attachment.originalFilename}
          className="text-xs text-sky-600 dark:text-sky-400 shrink-0 hover:underline"
        >
          Unduh
        </a>
      )}
    </div>
  );
}

interface AttachmentGalleryProps {
  attachments: AttachmentMeta[];
  readonly?: boolean;
  className?: string;
}

export function AttachmentGallery({ attachments, readonly = false, className }: AttachmentGalleryProps) {
  const [resolved, setResolved] = useState<ResolvedAttachment[]>(() =>
    attachments.map((a) => ({ ...a, url: null, loading: true, error: false })),
  );

  const loadUrl = useCallback(async (attachmentId: string, idx: number) => {
    try {
      const url = await fetchDownloadUrl(attachmentId);
      setResolved((prev) =>
        prev.map((a, i) => (i === idx ? { ...a, url, loading: false } : a)),
      );
    } catch {
      setResolved((prev) =>
        prev.map((a, i) => (i === idx ? { ...a, url: null, loading: false, error: true } : a)),
      );
    }
  }, []);

  useEffect(() => {
    attachments.forEach((a, idx) => {
      void loadUrl(a.id, idx);
    });
  }, [attachments, loadUrl]);

  if (attachments.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Lampiran ({attachments.length})
      </p>
      {resolved.map((att, idx) => (
        <AttachmentItem key={att.id ?? idx} attachment={att} readonly={readonly} />
      ))}
    </div>
  );
}
