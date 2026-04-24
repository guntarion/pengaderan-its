'use client';

/**
 * src/components/event-execution/CapacityEditor.tsx
 * NAWASENA M08 — Inline capacity editor for an instance.
 *
 * - Shows current capacity (null = unlimited)
 * - Inline edit with confirm
 * - Calls PATCH /api/event-execution/instances/[id]/capacity
 */

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { Loader2, PencilIcon, CheckIcon, XIcon, UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CapacityEditorProps {
  instanceId: string;
  capacity: number | null;
  confirmedCount?: number;
  onSuccess: () => void;
}

export function CapacityEditor({
  instanceId,
  capacity,
  confirmedCount = 0,
  onSuccess,
}: CapacityEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(capacity !== null ? String(capacity) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const newCapacity = value === '' ? null : parseInt(value, 10);
    if (value !== '' && (isNaN(newCapacity!) || newCapacity! < 1)) {
      toast.error('Kapasitas harus berupa angka positif atau kosongkan untuk unlimited.');
      return;
    }
    if (newCapacity !== null && newCapacity < confirmedCount) {
      toast.error(`Kapasitas tidak boleh kurang dari jumlah peserta terkonfirmasi (${confirmedCount}).`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}/capacity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newCapacity }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }
      toast.success(
        newCapacity === null
          ? 'Kapasitas diatur ke unlimited.'
          : `Kapasitas diperbarui ke ${newCapacity}.`,
      );
      setEditing(false);
      onSuccess();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(capacity !== null ? String(capacity) : '');
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <UsersIcon className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {capacity !== null ? (
            <>
              <span className="font-semibold">{capacity}</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">kapasitas</span>
            </>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-sm">Unlimited</span>
          )}
          {capacity !== null && confirmedCount > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
              ({confirmedCount} terdaftar)
            </span>
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
          className="h-6 w-6 p-0 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <UsersIcon className="h-4 w-4 text-gray-400" />
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Kosongkan = unlimited"
        min="1"
        max="10000"
        className="rounded-xl border-gray-200 dark:border-gray-700 text-sm h-7 w-36"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
      />
      <Button
        type="button"
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className="h-7 w-7 p-0 rounded-lg bg-sky-500 hover:bg-sky-600 text-white"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={handleCancel}
        disabled={saving}
        className="h-7 w-7 p-0 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <XIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
