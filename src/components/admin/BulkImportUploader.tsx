'use client';

/**
 * src/components/admin/BulkImportUploader.tsx
 * Drag-and-drop CSV uploader for bulk user import.
 *
 * Props:
 *   onPreviewResult — called when server returns preview result
 *   disabled       — disable during commit
 */

import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('BulkImportUploader');

export interface PreviewResult {
  token: string | null;
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    existingUsers: number;
    newUsers: number;
    unknownCohortCodes: string[];
  } | null;
  sample: {
    valid: Array<{
      lineNumber: number;
      data: Record<string, string>;
      isExisting: boolean;
    }>;
    errors: Array<{
      lineNumber: number;
      raw: Record<string, string | undefined>;
      errors: string[];
    }>;
  } | null;
  headerErrors: string[];
}

interface BulkImportUploaderProps {
  onPreviewResult: (result: PreviewResult) => void;
  disabled?: boolean;
}

export function BulkImportUploader({ onPreviewResult, disabled }: BulkImportUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      // Client-side validation
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('File harus berformat CSV (.csv)');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ukuran file tidak boleh melebihi 2 MB');
        return;
      }
      if (file.size === 0) {
        toast.error('File CSV tidak boleh kosong');
        return;
      }

      setSelectedFile(file);
      setIsUploading(true);
      log.info('Uploading CSV for preview', { fileName: file.name, sizeBytes: file.size });

      try {
        const form = new FormData();
        form.append('file', file);

        const res = await fetch('/api/admin/users/bulk-import/preview', {
          method: 'POST',
          body: form,
        });

        const json = await res.json();
        if (!res.ok) {
          const message = json?.error?.message || 'Gagal memproses file CSV';
          toast.error(message);
          log.warn('Preview API error', { status: res.status, message });
          return;
        }

        onPreviewResult(json.data as PreviewResult);
        toast.success('Preview berhasil dimuat');
      } catch (err) {
        toast.error('Terjadi kesalahan jaringan saat upload file');
        log.error('Upload error', { error: err });
      } finally {
        setIsUploading(false);
      }
    },
    [onPreviewResult]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled || isUploading) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, isUploading, handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input to allow re-upload of same file
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const isDisabled = disabled || isUploading;

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isDisabled && fileInputRef.current?.click()}
        className={[
          'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer',
          isDragOver
            ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/30'
            : 'border-sky-200 dark:border-sky-800 bg-white dark:bg-gray-900 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20',
          isDisabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : '',
        ].join(' ')}
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!isDisabled) fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleInputChange}
          disabled={isDisabled}
          aria-hidden="true"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
            <p className="text-sm font-medium text-sky-600 dark:text-sky-400">
              Memproses file...
            </p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-10 w-10 text-sky-400 dark:text-sky-500 mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Seret file CSV ke sini, atau klik untuk memilih
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Maks. 2 MB · Maks. 500 baris · Format: .csv
            </p>
          </>
        )}
      </div>

      {/* Selected file badge */}
      {selectedFile && !isUploading && (
        <div className="flex items-center gap-2 rounded-xl border border-sky-100 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/20 px-4 py-2.5">
          <FileText className="h-4 w-4 text-sky-500 flex-shrink-0" />
          <span className="text-sm text-gray-700 dark:text-gray-200 flex-1 truncate">
            {selectedFile.name}
          </span>
          <span className="text-xs text-gray-400">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearFile();
            }}
            className="text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Hapus file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Column format hint */}
      <div className="rounded-xl border border-amber-100 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
              Format kolom yang diperlukan:
            </p>
            <code className="text-xs text-amber-600 dark:text-amber-300">
              email, fullName, role, cohortCode, nrp (opsional), displayName (opsional)
            </code>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Role yang valid: MABA, KP, KASUH, OC, ELDER, SC, PEMBINA, BLM, SATGAS, ALUMNI, DOSEN_WALI
            </p>
          </div>
        </div>
      </div>

      {/* CSV template download link */}
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 h-auto py-1"
          onClick={() => {
            const csv = 'email,fullName,role,cohortCode,nrp,displayName\njohn@its.ac.id,John Doe,MABA,C26,1234567890,John\n';
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'template-bulk-import.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Unduh template CSV
        </Button>
      </div>
    </div>
  );
}
