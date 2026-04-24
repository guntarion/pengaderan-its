'use client';

/**
 * src/components/event-execution/OutputUploader.tsx
 * NAWASENA M08 — Multi-type output uploader with 4 tabs.
 *
 * Tabs: FILE (S3 presigned), LINK, VIDEO, REPO
 */

import { useState, useRef } from 'react';
import { toast } from '@/lib/toast';
import { Loader2, UploadIcon, LinkIcon, VideoIcon, GithubIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UploadTab = 'FILE' | 'LINK' | 'VIDEO' | 'REPO';

interface OutputUploaderProps {
  instanceId: string;
  onSuccess: () => void;
}

const TABS: { key: UploadTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'FILE', label: 'Upload File', icon: UploadIcon },
  { key: 'LINK', label: 'Link', icon: LinkIcon },
  { key: 'VIDEO', label: 'Video', icon: VideoIcon },
  { key: 'REPO', label: 'Repository', icon: GithubIcon },
];

export function OutputUploader({ instanceId, onSuccess }: OutputUploaderProps) {
  const [activeTab, setActiveTab] = useState<UploadTab>('FILE');
  const [loading, setLoading] = useState(false);
  const [fileCaption, setFileCaption] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlCaption, setUrlCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error('Pilih file terlebih dahulu.');
      return;
    }
    if (!fileCaption.trim()) {
      toast.error('Caption wajib diisi.');
      return;
    }
    if (file.size > 52_428_800) {
      toast.error('File melebihi batas 50MB.');
      return;
    }

    setLoading(true);
    try {
      // 1. Init upload — get presigned URL
      const initRes = await fetch(
        `/api/event-execution/instances/${instanceId}/outputs/init`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            caption: fileCaption,
          }),
        },
      );
      const initData = await initRes.json();
      if (!initRes.ok) {
        toast.apiError(initData);
        return;
      }

      const { outputId, uploadUrl } = initData.data;

      // 2. PUT to S3
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!putRes.ok) {
        toast.error('Upload ke storage gagal.');
        return;
      }

      // 3. Finalize
      const finalRes = await fetch(
        `/api/event-execution/instances/${instanceId}/outputs/${outputId}/finalize`,
        { method: 'POST' },
      );
      const finalData = await finalRes.json();
      if (!finalRes.ok) {
        toast.apiError(finalData);
        return;
      }

      toast.success('File berhasil diunggah!');
      setFileCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim() || !urlCaption.trim()) {
      toast.error('URL dan caption wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/event-execution/instances/${instanceId}/outputs/url-create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: activeTab, url: urlInput, caption: urlCaption }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      toast.success(`${activeTab} berhasil ditambahkan!`);
      setUrlInput('');
      setUrlCaption('');
      onSuccess();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
              activeTab === key
                ? 'bg-sky-500 text-white border-sky-500'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-sky-300'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* FILE tab */}
      {activeTab === 'FILE' && (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              Pilih File <span className="text-gray-400">(max 50MB)</span>
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.mp4"
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-sky-50 dark:file:bg-sky-950/30 file:text-sky-700 dark:file:text-sky-400 hover:file:bg-sky-100 dark:hover:file:bg-sky-900/30"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              Caption <span className="text-red-500">*</span>
            </Label>
            <Input
              value={fileCaption}
              onChange={(e) => setFileCaption(e.target.value)}
              placeholder="Deskripsi singkat file ini"
              maxLength={200}
              className="rounded-xl border-gray-200 dark:border-gray-700"
            />
          </div>
          <Button
            type="button"
            onClick={handleFileUpload}
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <UploadIcon className="mr-2 h-4 w-4" />
            Unggah File
          </Button>
        </div>
      )}

      {/* LINK/VIDEO/REPO tab */}
      {activeTab !== 'FILE' && (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              URL{' '}
              {activeTab === 'VIDEO' && (
                <span className="text-xs text-gray-400">(YouTube, Google Drive)</span>
              )}
              {activeTab === 'REPO' && (
                <span className="text-xs text-gray-400">(GitHub, GitLab)</span>
              )}
            </Label>
            <Input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              className="rounded-xl border-gray-200 dark:border-gray-700"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              Caption <span className="text-red-500">*</span>
            </Label>
            <Input
              value={urlCaption}
              onChange={(e) => setUrlCaption(e.target.value)}
              placeholder="Deskripsi singkat"
              maxLength={200}
              className="rounded-xl border-gray-200 dark:border-gray-700"
            />
          </div>
          <Button
            type="button"
            onClick={handleUrlSubmit}
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tambah {activeTab === 'LINK' ? 'Link' : activeTab === 'VIDEO' ? 'Video' : 'Repository'}
          </Button>
        </div>
      )}
    </div>
  );
}
