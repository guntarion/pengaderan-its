'use client';

/**
 * src/app/(DashboardLayout)/dashboard/time-capsule/[entryId]/page.tsx
 * NAWASENA M07 — Time Capsule entry detail + edit (if within 24h window).
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { TimeCapsulePreview } from '@/components/time-capsule/TimeCapsulePreview';
import { TimeCapsuleEditor, type TimeCapsuleEditorState } from '@/components/time-capsule/TimeCapsuleEditor';
import { getMoodEmoji, getMoodLabel } from '@/components/time-capsule/MoodSelector';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { SkeletonPageHeader, SkeletonText } from '@/components/shared/skeletons';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { EditIcon, LockIcon, ShareIcon, Loader2, ChevronLeft } from 'lucide-react';

interface EntryDetail {
  id: string;
  title: string | null;
  body: string;
  mood: number | null;
  sharedWithKasuh: boolean;
  publishedAt: string;
  editableUntil: string;
  attachments: Array<{ id: string; originalFilename: string; mimeType: string; size: number }>;
}

export default function TimeCapsuleDetailPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<TimeCapsuleEditorState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchEntry = useCallback(async () => {
    if (!entryId) return;
    try {
      const res = await fetch(`/api/time-capsule/${entryId}`);
      const json = await res.json();
      if (json.success) {
        setEntry(json.data);
        setEditState({
          title: json.data.title ?? '',
          body: json.data.body,
          mood: json.data.mood,
          sharedWithKasuh: json.data.sharedWithKasuh,
        });
      } else {
        toast.apiError(json);
        router.push('/dashboard/time-capsule');
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [entryId, router]);

  useEffect(() => {
    void fetchEntry();
  }, [fetchEntry]);

  const isEditable = entry ? new Date(entry.editableUntil) > new Date() : false;

  const handleSave = async () => {
    if (!entry || !editState) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/time-capsule/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editState.title || undefined,
          body: editState.body,
          mood: editState.mood ?? undefined,
          sharedWithKasuh: editState.sharedWithKasuh,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEntry(json.data);
        setIsEditing(false);
        toast.success('Catatan berhasil diperbarui!');
      } else {
        toast.apiError(json);
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 p-6">
        <div className="container mx-auto max-w-3xl space-y-4">
          <SkeletonPageHeader />
          <SkeletonText lines={8} />
        </div>
      </div>
    );
  }

  if (!entry) return null;

  const publishedDate = format(new Date(entry.publishedAt), 'EEEE, d MMMM yyyy · HH:mm', { locale: localeId });

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            labels={{ 'time-capsule': 'Time Capsule', [entryId]: entry.title ?? 'Detail' }}
            className="text-white/70 mb-2 text-sm"
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">
                {entry.title ?? <span className="italic opacity-80">Tanpa Judul</span>}
              </h1>
              <p className="text-sm text-white/80 mt-0.5">{publishedDate}</p>
            </div>
            {isEditable && !isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="bg-transparent border-white/40 text-white hover:bg-white/10 rounded-xl gap-1.5"
              >
                <EditIcon className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Meta badges */}
        <div className="flex flex-wrap gap-2 items-center">
          {entry.mood && (
            <span className="flex items-center gap-1 text-sm px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-sky-100 dark:border-sky-900">
              {getMoodEmoji(entry.mood)}
              <span className="text-xs text-gray-600 dark:text-gray-400">{getMoodLabel(entry.mood)}</span>
            </span>
          )}
          {entry.sharedWithKasuh ? (
            <span className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 px-3 py-1 bg-sky-50 dark:bg-sky-900/20 rounded-full border border-sky-200 dark:border-sky-800">
              <ShareIcon className="h-3 w-3" /> Dibagikan ke Kakak Kasuh
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-500 px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
              <LockIcon className="h-3 w-3" /> Privat
            </span>
          )}
          {entry.attachments.length > 0 && (
            <span className="text-xs text-gray-500 px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
              📎 {entry.attachments.length} lampiran
            </span>
          )}
          {isEditable && (
            <span className="text-xs text-amber-600 dark:text-amber-400 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-amber-200 dark:border-amber-800">
              Dapat diedit hingga {format(new Date(entry.editableUntil), 'HH:mm', { locale: localeId })}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          {isEditing && editState ? (
            <>
              <TimeCapsuleEditor
                initialState={editState}
                onChange={setEditState}
                disabled={isSaving}
              />
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-sky-100 dark:border-sky-900">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
                >
                  {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Menyimpan...</> : 'Simpan Perubahan'}
                </Button>
              </div>
            </>
          ) : (
            <TimeCapsulePreview content={entry.body} />
          )}
        </div>

        {/* Back link */}
        <Link href="/dashboard/time-capsule">
          <Button variant="outline" className="rounded-xl gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            Kembali ke daftar
          </Button>
        </Link>
      </div>
    </div>
  );
}
