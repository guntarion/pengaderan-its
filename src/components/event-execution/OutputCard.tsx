'use client';

/**
 * src/components/event-execution/OutputCard.tsx
 * NAWASENA M08 — Output upload card display.
 */

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/hooks/useConfirm';
import {
  FileIcon,
  LinkIcon,
  VideoIcon,
  GithubIcon,
  Trash2Icon,
  ExternalLinkIcon,
  ShieldAlertIcon,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface OutputItem {
  id: string;
  type: 'FILE' | 'LINK' | 'VIDEO' | 'REPO';
  url: string;
  caption: string;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  scanStatus: string;
  uploadedAt: string;
  uploader: { id: string; fullName: string };
}

interface OutputCardProps {
  instanceId: string;
  output: OutputItem;
  currentUserId: string;
  userRole: string;
  onDelete: () => void;
}

const TYPE_CONFIG = {
  FILE: { icon: FileIcon, label: 'File', cls: 'text-sky-600 dark:text-sky-400' },
  LINK: { icon: LinkIcon, label: 'Link', cls: 'text-blue-600 dark:text-blue-400' },
  VIDEO: { icon: VideoIcon, label: 'Video', cls: 'text-red-600 dark:text-red-400' },
  REPO: { icon: GithubIcon, label: 'Repository', cls: 'text-gray-700 dark:text-gray-300' },
} as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OutputCard({ instanceId, output, currentUserId, userRole, onDelete }: OutputCardProps) {
  const [deleting, setDeleting] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const canDelete =
    output.uploader.id === currentUserId || ['SC', 'SUPERADMIN'].includes(userRole);

  const { icon: TypeIcon, label: typeLabel, cls } = TYPE_CONFIG[output.type];

  const handleDelete = async () => {
    const ok = await confirm(
      'Hapus output ini?',
      'File/link akan dihapus dari database. File S3 akan dihapus secara terpisah.',
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/event-execution/instances/${instanceId}/outputs/${output.id}`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      toast.success('Output berhasil dihapus.');
      onDelete();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-sky-100 dark:border-sky-900 hover:shadow-sm transition-shadow">
      {/* Type icon */}
      <div className={`mt-0.5 shrink-0 ${cls}`}>
        <TypeIcon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
              {output.caption}
            </p>
            {output.originalFilename && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{output.originalFilename}</p>
            )}
          </div>
          <span className={`text-xs font-medium shrink-0 ${cls}`}>{typeLabel}</span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          <span>oleh {output.uploader.fullName}</span>
          <span>{format(new Date(output.uploadedAt), 'd MMM yyyy', { locale: localeId })}</span>
          {output.sizeBytes && <span>{formatBytes(output.sizeBytes)}</span>}
          {output.scanStatus === 'SUSPICIOUS' && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <ShieldAlertIcon className="h-3 w-3" /> Suspicious
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {output.url && (
          <a
            href={output.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-sky-500 transition-colors"
          >
            <ExternalLinkIcon className="h-4 w-4" />
          </a>
        )}
        {canDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={deleting}
            className="h-7 w-7 text-gray-400 hover:text-red-500"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2Icon className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>

      <ConfirmDialog />
    </div>
  );
}
