'use client';

/**
 * src/components/time-capsule/TimeCapsuleEditor.tsx
 * NAWASENA M07 — Markdown editor with Write/Preview tabs and auto-save.
 *
 * Uses plain textarea (no WYSIWYG) + react-markdown preview.
 * Auto-saves draft to localStorage and backend via useAutoSave hook.
 */

import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { TimeCapsulePreview } from './TimeCapsulePreview';
import { MoodSelector } from './MoodSelector';
import { useAutoSave } from '@/lib/auto-save';
import { cn } from '@/lib/utils';
import { Loader2, Info } from 'lucide-react';

export interface TimeCapsuleEditorState {
  title: string;
  body: string;
  mood: number | null;
  sharedWithKasuh: boolean;
}

interface TimeCapsuleEditorProps {
  initialState?: Partial<TimeCapsuleEditorState>;
  onChange: (state: TimeCapsuleEditorState) => void;
  disabled?: boolean;
  /** Backend URL for auto-save draft (e.g., '/api/time-capsule/draft') */
  draftUrl?: string;
  /** localStorage key for local draft backup */
  localStorageKey?: string;
  /** Called when a local draft is recovered */
  onDraftRecovered?: (draft: TimeCapsuleEditorState) => void;
}

const MARKDOWN_TIPS = `**Tebal**, *miring*, \`kode\`, # Judul, ## Sub-judul, - Daftar, > Kutipan`;

const DEFAULT_STATE: TimeCapsuleEditorState = {
  title: '',
  body: '',
  mood: null,
  sharedWithKasuh: false,
};

export function TimeCapsuleEditor({
  initialState,
  onChange,
  disabled,
  draftUrl = '/api/time-capsule/draft',
  localStorageKey = 'tc-draft',
  onDraftRecovered,
}: TimeCapsuleEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [state, setState] = useState<TimeCapsuleEditorState>({
    ...DEFAULT_STATE,
    ...initialState,
  });

  const updateState = useCallback(
    (updates: Partial<TimeCapsuleEditorState>) => {
      setState((prev) => {
        const next = { ...prev, ...updates };
        onChange(next);
        return next;
      });
    },
    [onChange],
  );

  // ── Auto-save hook ──────────────────────────────────────────────────────
  const { savedAt, isSaving } = useAutoSave({
    localStorageKey,
    backendUrl: draftUrl,
    value: state,
    debounceMs: 30000,
    onConflict: (localDraft, localSavedAt) => {
      // Only recover if local draft is different from initialState
      const hasContent = (localDraft as TimeCapsuleEditorState).body?.length > 0;
      if (hasContent && onDraftRecovered) {
        onDraftRecovered(localDraft as TimeCapsuleEditorState);
      }
      void localSavedAt;
    },
  });

  // Sync initialState changes
  useEffect(() => {
    if (initialState) {
      setState((prev) => ({ ...prev, ...initialState }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const charCount = state.body.length;
  const charLimit = 10000;
  const charLimitWarning = charCount > charLimit * 0.9;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <input
          type="text"
          value={state.title}
          onChange={(e) => updateState({ title: e.target.value })}
          disabled={disabled}
          placeholder="Judul (opsional, maks 120 karakter)"
          maxLength={120}
          className={cn(
            'w-full px-4 py-2.5 border border-sky-200 dark:border-sky-800',
            'rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none',
            'bg-white dark:bg-slate-700 text-sm text-gray-800 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['write', 'preview'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === tab
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 text-gray-600 dark:text-gray-400 hover:border-sky-300',
            )}
          >
            {tab === 'write' ? 'Tulis' : 'Pratinjau'}
          </button>
        ))}
      </div>

      {/* Editor / Preview */}
      <div className="relative">
        {activeTab === 'write' ? (
          <div>
            <textarea
              value={state.body}
              onChange={(e) => updateState({ body: e.target.value })}
              disabled={disabled}
              placeholder="Tulis refleksimu di sini... Kamu bisa menggunakan Markdown untuk memformat teks."
              rows={12}
              maxLength={charLimit}
              className={cn(
                'w-full px-4 py-3 border border-sky-200 dark:border-sky-800',
                'rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none',
                'bg-white dark:bg-slate-700 text-sm text-gray-800 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'resize-y min-h-[200px] font-mono',
                disabled && 'opacity-60 cursor-not-allowed',
                charLimitWarning && 'border-amber-400',
              )}
            />
            {/* Character count */}
            <div className={cn(
              'flex justify-between items-center mt-1 text-xs',
              charLimitWarning ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500',
            )}>
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                {MARKDOWN_TIPS}
              </span>
              <span>{charCount.toLocaleString('id-ID')}/{charLimit.toLocaleString('id-ID')}</span>
            </div>
          </div>
        ) : (
          <div className="min-h-[200px] p-4 border border-sky-200 dark:border-sky-800 rounded-xl bg-white dark:bg-slate-800">
            {state.body ? (
              <TimeCapsulePreview content={state.body} />
            ) : (
              <p className="text-sm text-gray-400 italic">
                Belum ada konten untuk ditampilkan. Tulis sesuatu di tab &quot;Tulis&quot; terlebih dahulu.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Mood + Share */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-sky-50 dark:bg-sky-900/10 rounded-xl border border-sky-100 dark:border-sky-900">
        <div className="flex-1">
          <MoodSelector
            value={state.mood}
            onChange={(mood) => updateState({ mood })}
            disabled={disabled}
          />
        </div>

        <div className="flex items-center gap-2 sm:border-l sm:border-sky-200 dark:sm:border-sky-800 sm:pl-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.sharedWithKasuh}
              onChange={(e) => updateState({ sharedWithKasuh: e.target.checked })}
              disabled={disabled}
              className="w-4 h-4 rounded accent-sky-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Bagikan ke Kakak Kasuh
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Kakak Kasuhmu akan bisa membaca entry ini
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Auto-save indicator */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        {isSaving ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Menyimpan...</span>
          </>
        ) : savedAt ? (
          <span>
            Tersimpan otomatis{' '}
            {format(savedAt, 'HH:mm', { locale: localeId })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
