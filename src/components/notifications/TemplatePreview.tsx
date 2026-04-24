'use client';

/**
 * src/components/notifications/TemplatePreview.tsx
 * NAWASENA M15 — Preview pane for notification templates
 * Push: notification card mockup. Email: rendered HTML in iframe or pre.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, Mail, RefreshCw } from 'lucide-react';
import { createLogger } from '@/lib/logger';
import { toast } from '@/lib/toast';

const log = createLogger('template-preview');

interface TemplatePreviewProps {
  templateKey: string;
  versionId: string;
  channel: 'PUSH' | 'EMAIL';
  className?: string;
}

interface PreviewData {
  channel: string;
  subject?: string;
  title?: string;
  body?: string;
  html?: string;
}

export function TemplatePreview({ templateKey, versionId, channel, className }: TemplatePreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchPreview() {
    setLoading(true);
    try {
      log.info('Fetching template preview', { templateKey, versionId, channel });
      const res = await fetch(
        `/api/notifications/admin/templates/${templateKey}/versions/${versionId}/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel }),
        },
      );
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setPreview(json.data);
    } catch (err) {
      log.error('Failed to fetch preview', { err });
      toast.error('Gagal memuat pratinjau template');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {channel === 'PUSH' ? (
            <Bell className="h-4 w-4 text-violet-500" />
          ) : (
            <Mail className="h-4 w-4 text-blue-500" />
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Pratinjau {channel}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs"
          disabled={loading}
          onClick={fetchPreview}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          {loading ? 'Memuat...' : preview ? 'Muat Ulang' : 'Pratinjau'}
        </Button>
      </div>

      {preview ? (
        channel === 'PUSH' ? (
          <PushPreviewCard title={preview.title} body={preview.body} />
        ) : (
          <EmailPreviewPane subject={preview.subject} html={preview.html} body={preview.body} />
        )
      ) : (
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Klik &ldquo;Pratinjau&rdquo; untuk melihat tampilan notifikasi
          </p>
        </div>
      )}
    </div>
  );
}

function PushPreviewCard({ title, body }: { title?: string; body?: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Bell className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              NAWASENA
            </span>
            <span className="text-xs text-gray-400">sekarang</span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
            {title ?? '(Judul tidak tersedia)'}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
            {body ?? '(Isi tidak tersedia)'}
          </p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-300 border">
          Pratinjau Push Notification
        </Badge>
      </div>
    </div>
  );
}

function EmailPreviewPane({ subject, html, body }: { subject?: string; html?: string; body?: string }) {
  return (
    <div className="space-y-2">
      {subject && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Subject: </span>
          <span className="text-sm text-blue-800 dark:text-blue-200">{subject}</span>
        </div>
      )}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {html ? (
          <iframe
            srcDoc={html}
            className="w-full min-h-64 border-0"
            sandbox="allow-same-origin"
            title="Email preview"
          />
        ) : (
          <pre className="text-xs text-gray-700 dark:text-gray-300 p-4 overflow-auto max-h-80 font-mono whitespace-pre-wrap">
            {body ?? '(Konten tidak tersedia)'}
          </pre>
        )}
      </div>
      <div>
        <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300 border">
          Pratinjau Email
        </Badge>
      </div>
    </div>
  );
}
