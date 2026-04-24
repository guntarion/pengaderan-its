'use client';

/**
 * src/components/triwulan/NarrativeEditor.tsx
 * NAWASENA M14 — Textarea for SC to write/edit the executive narrative.
 * Shows word count + min-200-char enforcement.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

const MIN_CHARS = 200;
const DEBOUNCE_MS = 3000;

interface NarrativeEditorProps {
  reviewId: string;
  initialNarrative: string;
  readonly?: boolean;
  onSaved?: (narrative: string) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function NarrativeEditor({
  reviewId,
  initialNarrative,
  readonly = false,
  onSaved,
}: NarrativeEditorProps) {
  const [value, setValue] = useState(initialNarrative);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialNarrative);

  const saveNarrative = useCallback(
    async (text: string) => {
      if (text === lastSavedRef.current) return;
      setSaveStatus('saving');
      try {
        const res = await fetch(`/api/triwulan/${reviewId}/edit-draft`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ narrative: text }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.apiError(data);
          setSaveStatus('error');
          return;
        }
        lastSavedRef.current = text;
        setSaveStatus('saved');
        onSaved?.(text);
        // Reset saved indicator after 2s
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        toast.apiError(err);
        setSaveStatus('error');
      }
    },
    [reviewId, onSaved]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);
    setSaveStatus('idle');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveNarrative(text);
    }, DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const charCount = value.trim().length;
  const isInsufficient = charCount < MIN_CHARS;

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          disabled={readonly}
          rows={8}
          placeholder="Tulis narasi eksekutif triwulan di sini... (minimal 200 karakter)"
          className={`w-full px-4 py-3 text-sm rounded-xl border bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 resize-y transition-colors ${
            isInsufficient && charCount > 0
              ? 'border-red-300 focus:ring-red-300 dark:border-red-700'
              : 'border-sky-200 focus:ring-sky-300 dark:border-sky-800'
          } ${readonly ? 'cursor-default opacity-70' : ''}`}
        />
        {!readonly && (
          <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5">
            {saveStatus === 'saving' && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" />
            )}
            {saveStatus === 'saved' && (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            )}
            {saveStatus === 'error' && (
              <Save className="h-3.5 w-3.5 text-red-500" />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p
          className={`text-xs ${
            isInsufficient && charCount > 0
              ? 'text-red-500 dark:text-red-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {charCount}/{MIN_CHARS} karakter minimum
          {isInsufficient && charCount > 0 && ` — kurang ${MIN_CHARS - charCount} lagi`}
        </p>
        {saveStatus === 'saved' && (
          <p className="text-xs text-emerald-500">Tersimpan</p>
        )}
        {saveStatus === 'error' && (
          <button
            type="button"
            onClick={() => saveNarrative(value)}
            className="text-xs text-sky-500 underline"
          >
            Coba simpan lagi
          </button>
        )}
      </div>
    </div>
  );
}
