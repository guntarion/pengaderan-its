/**
 * src/components/admin/master/TaxonomyMetaEditor.tsx
 * Inline editor for TaxonomyMeta entries (SUPERADMIN).
 */

'use client';

import React, { useState } from 'react';
import { toast } from '@/lib/toast';
import { Pencil, Check, X } from 'lucide-react';

interface TaxonomyMeta {
  id: string;
  group: string;
  labelId: string;
  labelEn: string;
  deskripsi: string | null;
  displayOrder: number;
}

interface TaxonomyMetaEditorProps {
  items: TaxonomyMeta[];
}

async function patchTaxonomy(key: string, data: { labelId?: string; labelEn?: string; deskripsi?: string }) {
  const res = await fetch(`/api/admin/master/taksonomi/${key}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json();
}

const GROUP_ORDER = ['NILAI', 'DIMENSI', 'FASE', 'KATEGORI'];

interface EditRowProps {
  item: TaxonomyMeta;
  onSave: (id: string, updated: Partial<TaxonomyMeta>) => void;
}

function EditRow({ item, onSave }: EditRowProps) {
  const [editing, setEditing] = useState(false);
  const [labelId, setLabelId] = useState(item.labelId);
  const [labelEn, setLabelEn] = useState(item.labelEn);
  const [deskripsi, setDeskripsi] = useState(item.deskripsi ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await patchTaxonomy(item.id, { labelId, labelEn, deskripsi: deskripsi || undefined });
      onSave(item.id, { labelId, labelEn, deskripsi: deskripsi || null });
      setEditing(false);
      toast.success('Label diperbarui');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLabelId(item.labelId);
    setLabelEn(item.labelEn);
    setDeskripsi(item.deskripsi ?? '');
    setEditing(false);
  };

  return (
    <tr className="border-b border-gray-50 dark:border-slate-700 hover:bg-sky-50/50 dark:hover:bg-sky-900/10">
      <td className="py-2.5 pr-3">
        <span className="font-mono text-xs text-gray-500 dark:text-gray-500">{item.id}</span>
      </td>
      <td className="py-2.5 pr-3">
        {editing ? (
          <input
            value={labelId}
            onChange={(e) => setLabelId(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-sky-300 dark:border-sky-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200"
          />
        ) : (
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.labelId}</span>
        )}
      </td>
      <td className="py-2.5 pr-3">
        {editing ? (
          <input
            value={labelEn}
            onChange={(e) => setLabelEn(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-sky-300 dark:border-sky-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200"
          />
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400 italic">{item.labelEn}</span>
        )}
      </td>
      <td className="py-2.5 pr-3 hidden md:table-cell">
        {editing ? (
          <input
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-sky-300 dark:border-sky-600 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300"
            placeholder="Deskripsi opsional"
          />
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">{item.deskripsi ?? '—'}</span>
        )}
      </td>
      <td className="py-2.5">
        {editing ? (
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition-colors disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

export function TaxonomyMetaEditor({ items }: TaxonomyMetaEditorProps) {
  const [rows, setRows] = useState<TaxonomyMeta[]>(items);

  const handleSave = (id: string, updated: Partial<TaxonomyMeta>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
  };

  const grouped = rows.reduce<Record<string, TaxonomyMeta[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {GROUP_ORDER.map((group) => {
        const groupItems = grouped[group];
        if (!groupItems || groupItems.length === 0) return null;
        const sorted = [...groupItems].sort((a, b) => a.displayOrder - b.displayOrder);

        return (
          <div key={group}>
            <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
              {group} ({sorted.length})
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700">
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-3">Key</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-3">Label ID</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-3">Label EN</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-3 hidden md:table-cell">Deskripsi</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((item) => (
                      <EditRow key={item.id} item={item} onSave={handleSave} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
