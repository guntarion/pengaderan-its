'use client';

/**
 * src/components/triwulan/AuditSubstansiCard.tsx
 * NAWASENA M14 — Single audit substansi item card for BLM to fill.
 * Auto-saves on debounce 10s.
 */

import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Minus, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { MuatanWajibKey, MuatanCoverageStatus } from '@prisma/client';

interface AuditSubstansiCardProps {
  reviewId: string;
  itemKey: MuatanWajibKey;
  label: string;
  description: string;
  currentCoverage: MuatanCoverageStatus;
  currentNotes: string | null;
  currentEvidenceRef: string | null;
  assessedByName: string | null;
  readonly?: boolean;
  onSaved?: (
    key: MuatanWajibKey,
    coverage: MuatanCoverageStatus,
    notes: string,
    evidenceRef: string
  ) => void;
}

const COVERAGE_OPTIONS: { value: MuatanCoverageStatus; label: string; icon: React.ElementType; color: string }[] = [
  {
    value: MuatanCoverageStatus.COVERED,
    label: 'Tercakup',
    icon: CheckCircle2,
    color:
      'bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300',
  },
  {
    value: MuatanCoverageStatus.PARTIAL,
    label: 'Sebagian',
    icon: AlertCircle,
    color:
      'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300',
  },
  {
    value: MuatanCoverageStatus.NOT_COVERED,
    label: 'Tidak Tercakup',
    icon: XCircle,
    color:
      'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300',
  },
  {
    value: MuatanCoverageStatus.NOT_ASSESSED,
    label: 'Belum Dinilai',
    icon: Minus,
    color:
      'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400',
  },
];

const DEBOUNCE_MS = 10_000;

export function AuditSubstansiCard({
  reviewId,
  itemKey,
  label,
  description,
  currentCoverage,
  currentNotes,
  currentEvidenceRef,
  assessedByName,
  readonly = false,
  onSaved,
}: AuditSubstansiCardProps) {
  const [coverage, setCoverage] = useState<MuatanCoverageStatus>(currentCoverage);
  const [notes, setNotes] = useState(currentNotes ?? '');
  const [evidenceRef, setEvidenceRef] = useState(currentEvidenceRef ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const needsNotes =
    coverage === MuatanCoverageStatus.NOT_COVERED ||
    coverage === MuatanCoverageStatus.PARTIAL;

  const save = async (
    cov: MuatanCoverageStatus,
    n: string,
    er: string
  ) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/triwulan/${reviewId}/blm-audit-item`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemKey,
          coverage: cov,
          notes: n || undefined,
          evidenceRef: er || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.apiError(data);
        return;
      }
      setSavedAt(new Date());
      onSaved?.(itemKey, cov, n, er);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSaving(false);
    }
  };

  const scheduleDebounce = (cov: MuatanCoverageStatus, n: string, er: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      save(cov, n, er);
    }, DEBOUNCE_MS);
  };

  const handleCoverageChange = (val: MuatanCoverageStatus) => {
    if (readonly) return;
    setCoverage(val);
    scheduleDebounce(val, notes, evidenceRef);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    scheduleDebounce(coverage, e.target.value, evidenceRef);
  };

  const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEvidenceRef(e.target.value);
    scheduleDebounce(coverage, notes, e.target.value);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        {saving && (
          <Loader2 className="h-4 w-4 animate-spin text-sky-500 shrink-0 mt-0.5" />
        )}
        {!saving && savedAt && (
          <span title={`Tersimpan ${savedAt.toLocaleTimeString('id-ID')}`}>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          </span>
        )}
      </div>

      {/* Coverage selector */}
      <div className="flex flex-wrap gap-2">
        {COVERAGE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = coverage === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={readonly}
              onClick={() => handleCoverageChange(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                isSelected
                  ? opt.color
                  : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-400'
              } ${readonly ? 'cursor-default' : 'hover:opacity-80 cursor-pointer'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Notes (required when NOT_COVERED or PARTIAL) */}
      {(needsNotes || notes) && !readonly && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Catatan{needsNotes ? ' (wajib ≥ 50 karakter)' : ''}
          </label>
          <textarea
            value={notes}
            onChange={handleNotesChange}
            disabled={readonly}
            rows={3}
            placeholder="Jelaskan temuan atau kondisi..."
            className={`w-full px-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 resize-none ${
              needsNotes && notes.trim().length > 0 && notes.trim().length < 50
                ? 'border-red-300 focus:ring-red-300 dark:border-red-700'
                : 'border-sky-200 focus:ring-sky-300 dark:border-sky-800'
            }`}
          />
          {needsNotes && notes.trim().length > 0 && notes.trim().length < 50 && (
            <p className="text-xs text-red-500 mt-0.5">
              {50 - notes.trim().length} karakter lagi
            </p>
          )}
        </div>
      )}

      {/* Readonly notes display */}
      {readonly && notes && (
        <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-xl px-3 py-2">
          {notes}
        </p>
      )}

      {/* Evidence ref */}
      {!readonly && (
        <input
          type="text"
          value={evidenceRef}
          onChange={handleEvidenceChange}
          disabled={readonly}
          placeholder="Referensi bukti (opsional, misal: nomor dokumen)"
          className="w-full px-3 py-2 text-xs rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
      )}

      {/* Assessor info */}
      {assessedByName && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Dinilai oleh {assessedByName}
        </p>
      )}
    </div>
  );
}
