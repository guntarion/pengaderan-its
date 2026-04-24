'use client';

/**
 * src/components/notifications/TemplateVersionEditor.tsx
 * NAWASENA M15 — Editor for a template version (create/view)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, CheckCircle, ArrowLeft } from 'lucide-react';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { TemplatePreview } from './TemplatePreview';

const log = createLogger('template-version-editor');

export interface TemplateVersionData {
  id?: string;
  version?: string;
  format: 'PLAIN' | 'MARKDOWN' | 'REACT_EMAIL';
  publishedAt?: string | null;
  content: {
    push?: { title?: string; body?: string };
    email?: { subject?: string; reactComponent?: string };
    whatsapp?: { body?: string };
  };
}

interface TemplateVersionEditorProps {
  templateKey: string;
  initialData?: TemplateVersionData;
  mode: 'new' | 'view';
}

export function TemplateVersionEditor({ templateKey, initialData, mode }: TemplateVersionEditorProps) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();

  const [format, setFormat] = useState<'PLAIN' | 'MARKDOWN' | 'REACT_EMAIL'>(
    initialData?.format ?? 'PLAIN',
  );
  const [version, setVersion] = useState(initialData?.version ?? '');
  const [pushTitle, setPushTitle] = useState(initialData?.content?.push?.title ?? '');
  const [pushBody, setPushBody] = useState(initialData?.content?.push?.body ?? '');
  const [emailSubject, setEmailSubject] = useState(initialData?.content?.email?.subject ?? '');
  const [reactComponent, setReactComponent] = useState(initialData?.content?.email?.reactComponent ?? '');
  const [whatsappBody, setWhatsappBody] = useState(initialData?.content?.whatsapp?.body ?? '');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const isPublished = !!initialData?.publishedAt;
  const isReadOnly = mode === 'view' && isPublished;

  async function handleSave() {
    if (!version.trim()) {
      toast.error('Versi harus diisi (format: x.y.z)');
      return;
    }

    setSaving(true);
    try {
      log.info('Saving template version', { templateKey, version });

      const res = await fetch(`/api/notifications/admin/templates/${templateKey}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version,
          format,
          content: {
            ...(pushTitle || pushBody ? { push: { title: pushTitle, body: pushBody } } : {}),
            ...(emailSubject || reactComponent ? { email: { subject: emailSubject, reactComponent } } : {}),
            ...(whatsappBody ? { whatsapp: { body: whatsappBody } } : {}),
          },
        }),
      });

      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }

      const json = await res.json();
      toast.success('Versi berhasil disimpan');
      router.push(`/admin/notifications/templates/${templateKey}/versions/${json.data.id}`);
    } catch (err) {
      log.error('Failed to save version', { err });
      toast.error('Gagal menyimpan versi');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!initialData?.id) return;

    const confirmed = await confirm({
      title: 'Terbitkan Versi Ini?',
      description: 'Versi ini akan menjadi versi aktif. Template yang sedang berjalan akan menggunakan konten baru ini.',
      confirmLabel: 'Terbitkan',
    });
    if (!confirmed) return;

    setPublishing(true);
    try {
      log.info('Publishing template version', { versionId: initialData.id });

      const res = await fetch(
        `/api/notifications/admin/templates/${templateKey}/versions/${initialData.id}/publish`,
        { method: 'POST' },
      );

      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }

      toast.success('Versi berhasil diterbitkan sebagai versi aktif');
      router.refresh();
    } catch (err) {
      log.error('Failed to publish version', { err });
      toast.error('Gagal menerbitkan versi');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 text-gray-500 hover:text-gray-700"
            onClick={() => router.push(`/admin/notifications/templates/${templateKey}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali ke Template
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'new' ? 'Versi Baru' : `Versi ${initialData?.version ?? ''}`}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-0.5">{templateKey}</p>
        </div>

        {initialData?.publishedAt ? (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 border text-xs flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Diterbitkan {new Date(initialData.publishedAt).toLocaleDateString('id-ID')}
          </Badge>
        ) : initialData?.id ? (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 border text-xs">
            Draft
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor form */}
        <div className="space-y-5">
          {/* Version + Format */}
          <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Info Versi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                  Nomor Versi <span className="text-red-500">*</span>
                </Label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.2.0"
                  disabled={mode !== 'new'}
                  className="w-full px-3 py-2 border border-sky-200 dark:border-sky-800 rounded-xl
                    focus:ring-2 focus:ring-sky-500 focus:outline-none
                    bg-white dark:bg-slate-700 text-sm
                    disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">Format semver: x.y.z (contoh: 1.0.0, 1.2.3)</p>
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                  Format
                </Label>
                <Select
                  value={format}
                  onValueChange={(v) => setFormat(v as typeof format)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="border-sky-200 dark:border-sky-800 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLAIN">PLAIN — Teks biasa</SelectItem>
                    <SelectItem value="MARKDOWN">MARKDOWN</SelectItem>
                    <SelectItem value="REACT_EMAIL">REACT_EMAIL — Komponen React Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Push content */}
          <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Konten Push Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                  Judul
                </Label>
                <input
                  type="text"
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  placeholder="Judul notifikasi push..."
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-sky-200 dark:border-sky-800 rounded-xl
                    focus:ring-2 focus:ring-sky-500 focus:outline-none
                    bg-white dark:bg-slate-700 text-sm
                    disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">Gunakan {'{{variabel}}'} untuk substitusi dinamis</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                  Isi
                </Label>
                <textarea
                  value={pushBody}
                  onChange={(e) => setPushBody(e.target.value)}
                  placeholder="Isi notifikasi push..."
                  disabled={isReadOnly}
                  rows={3}
                  className="w-full px-3 py-2 border border-sky-200 dark:border-sky-800 rounded-xl
                    focus:ring-2 focus:ring-sky-500 focus:outline-none
                    bg-white dark:bg-slate-700 text-sm resize-none
                    disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Email content */}
          <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Konten Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                  Subject Email
                </Label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject email..."
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-sky-200 dark:border-sky-800 rounded-xl
                    focus:ring-2 focus:ring-sky-500 focus:outline-none
                    bg-white dark:bg-slate-700 text-sm
                    disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400"
                />
              </div>
              {format === 'REACT_EMAIL' && (
                <div>
                  <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                    React Email Component Key
                  </Label>
                  <input
                    type="text"
                    value={reactComponent}
                    onChange={(e) => setReactComponent(e.target.value)}
                    placeholder="Contoh: MabaPulseDaily"
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-sky-200 dark:border-sky-800 rounded-xl
                      focus:ring-2 focus:ring-sky-500 focus:outline-none
                      bg-white dark:bg-slate-700 text-sm font-mono
                      disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">Nama komponen di src/emails/</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Konten WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                  Pesan WhatsApp
                </Label>
                <textarea
                  value={whatsappBody}
                  onChange={(e) => setWhatsappBody(e.target.value)}
                  placeholder="Pesan WhatsApp..."
                  disabled={isReadOnly}
                  rows={3}
                  className="w-full px-3 py-2 border border-sky-200 dark:border-sky-800 rounded-xl
                    focus:ring-2 focus:ring-sky-500 focus:outline-none
                    bg-white dark:bg-slate-700 text-sm resize-none
                    disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {!isReadOnly && (
            <div className="flex items-center gap-3">
              {mode === 'new' && (
                <Button
                  className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? 'Menyimpan...' : 'Simpan Versi'}
                </Button>
              )}
              {mode === 'view' && !isPublished && initialData?.id && (
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                  disabled={publishing}
                  onClick={handlePublish}
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {publishing ? 'Menerbitkan...' : 'Terbitkan Sebagai Versi Aktif'}
                </Button>
              )}
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => router.push(`/admin/notifications/templates/${templateKey}`)}
              >
                Batal
              </Button>
            </div>
          )}
        </div>

        {/* Preview pane */}
        {initialData?.id && (
          <div className="space-y-6">
            <TemplatePreview
              templateKey={templateKey}
              versionId={initialData.id}
              channel="PUSH"
            />
            <TemplatePreview
              templateKey={templateKey}
              versionId={initialData.id}
              channel="EMAIL"
            />
          </div>
        )}
      </div>

      <ConfirmDialog />
    </div>
  );
}
