'use client';

/**
 * src/app/(DashboardLayout)/dashboard/time-capsule/new/page.tsx
 * NAWASENA M07 — New Time Capsule entry editor page.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { TimeCapsuleEditor, type TimeCapsuleEditorState } from '@/components/time-capsule/TimeCapsuleEditor';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { clearLocalDraft } from '@/lib/auto-save';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const DRAFT_KEY = 'tc-draft-new';

export default function NewTimeCapsulePage() {
  const router = useRouter();
  const [editorState, setEditorState] = useState<TimeCapsuleEditorState>({
    title: '',
    body: '',
    mood: null,
    sharedWithKasuh: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftRecovered, setDraftRecovered] = useState(false);

  const handleChange = useCallback((state: TimeCapsuleEditorState) => {
    setEditorState(state);
  }, []);

  const handleDraftRecovered = useCallback((draft: TimeCapsuleEditorState) => {
    setEditorState(draft);
    setDraftRecovered(true);
  }, []);

  const handleSubmit = async () => {
    if (!editorState.body.trim()) {
      toast.error('Isi catatan tidak boleh kosong');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/time-capsule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editorState.title || undefined,
          body: editorState.body,
          mood: editorState.mood ?? undefined,
          sharedWithKasuh: editorState.sharedWithKasuh,
        }),
      });

      const json = await res.json();

      if (json.success) {
        clearLocalDraft(DRAFT_KEY);
        toast.success('Catatan berhasil disimpan!');
        router.push(`/dashboard/time-capsule/${json.data.id}`);
      } else {
        toast.apiError(json);
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            labels={{
              'time-capsule': 'Time Capsule',
              'new': 'Tulis Baru',
            }}
            className="text-white/70 mb-2 text-sm"
          />
          <h1 className="text-xl font-bold">Tulis Catatan Baru</h1>
          <p className="text-sm text-white/80 mt-0.5">
            Setiap catatan dapat diedit dalam 24 jam setelah disimpan
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Draft recovered banner */}
        {draftRecovered && (
          <Alert className="border-amber-400 bg-amber-50 dark:bg-amber-900/20">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Draft sebelumnya berhasil dipulihkan dari perangkatmu.
            </AlertDescription>
          </Alert>
        )}

        {/* Editor */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <TimeCapsuleEditor
            initialState={editorState}
            onChange={handleChange}
            disabled={isSubmitting}
            draftUrl="/api/time-capsule/draft"
            localStorageKey={DRAFT_KEY}
            onDraftRecovered={handleDraftRecovered}
          />
        </div>

        {/* Submit button */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !editorState.body.trim()}
            className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl min-w-[120px]"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Menyimpan...</>
            ) : (
              'Simpan Catatan'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
