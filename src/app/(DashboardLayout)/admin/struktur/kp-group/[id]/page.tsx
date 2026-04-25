'use client';

/**
 * /admin/struktur/kp-group/[id]
 * SC/OC/SUPERADMIN — detail KP Group + daftar anggota.
 */

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Network, UserPlus, Trash2, ArrowLeft } from 'lucide-react';

const log = createLogger('admin-kp-group-detail');

interface KPGroupMember {
  id: string;
  userId: string;
  memberType: string;
  joinedAt: string;
  leftAt: string | null;
  user: { id: string; fullName: string; displayName: string; nrp: string; role: string };
}

interface KPGroupDetail {
  id: string;
  code: string;
  name: string;
  status: string;
  capacityTarget: number;
  capacityMax: number;
  cohort: { id: string; code: string; name: string };
  coordinator: { id: string; fullName: string; displayName: string } | null;
  members: KPGroupMember[];
}

const statusColor = (s: string) => {
  switch (s) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'DRAFT': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'ARCHIVED': return 'bg-gray-100 text-gray-700 border-gray-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function KPGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [group, setGroup] = useState<KPGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');

  const fetchGroup = useCallback(async () => {
    try {
      log.info('Fetching KP group detail', { id });
      const res = await fetch(`/api/admin/struktur/kp-groups/${id}`);
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setGroup(json.data);
    } catch (err) {
      log.error('Failed to fetch KP group detail', { err });
      toast.error('Gagal memuat detail KP Group');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  async function handleArchive() {
    const confirmed = await confirm({
      title: 'Arsipkan KP Group?',
      description: 'KP Group tidak akan bisa digunakan lagi setelah diarsipkan.',
      confirmLabel: 'Arsipkan',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/struktur/kp-groups/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success('KP Group berhasil diarsipkan');
      router.push('/admin/struktur/kp-group');
    } catch (err) {
      log.error('Failed to archive KP group', { err });
      toast.error('Gagal mengarsipkan KP Group');
    }
  }

  async function handleAddMember() {
    if (!newMemberUserId.trim()) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/admin/struktur/kp-groups/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newMemberUserId.trim(), memberType: 'MABA' }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success('Anggota berhasil ditambahkan');
      setNewMemberUserId('');
      await fetchGroup();
    } catch (err) {
      log.error('Failed to add member', { err });
      toast.error('Gagal menambah anggota');
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(member: KPGroupMember) {
    const confirmed = await confirm({
      title: `Keluarkan ${member.user.displayName ?? member.user.fullName}?`,
      description: 'Anggota akan dicatat keluar dari grup ini.',
      confirmLabel: 'Keluarkan',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/struktur/kp-groups/${id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.userId, reason: 'Dikeluarkan oleh SC' }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success('Anggota berhasil dikeluarkan');
      await fetchGroup();
    } catch (err) {
      log.error('Failed to remove member', { err });
      toast.error('Gagal mengeluarkan anggota');
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb labels={{ [id]: 'Detail KP Group' }} />
        <SkeletonCard />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6">
        <DynamicBreadcrumb />
        <p className="text-gray-500 mt-4">KP Group tidak ditemukan.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>
    );
  }

  const activeMembers = group.members.filter((m) => !m.leftAt);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <DynamicBreadcrumb labels={{ [id]: group.code }} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{group.code} — {group.name}</h1>
              <Badge className={`text-xs ${statusColor(group.status)}`}>{group.status}</Badge>
            </div>
            <p className="text-sm text-gray-500">
              Kohort: {group.cohort?.code} &bull; Koordinator: {group.coordinator?.displayName ?? group.coordinator?.fullName ?? 'Belum ditentukan'}
            </p>
          </div>
        </div>
        {group.status !== 'ARCHIVED' && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleArchive}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Arsipkan
          </Button>
        )}
      </div>

      {/* Kapasitas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Aktif', value: activeMembers.length },
          { label: 'Target', value: group.capacityTarget },
          { label: 'Maks', value: group.capacityMax },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 text-center shadow-sm"
          >
            <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">{item.value}</p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Tambah anggota */}
      {group.status !== 'ARCHIVED' && (
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tambah Anggota Manual</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMemberUserId}
              onChange={(e) => setNewMemberUserId(e.target.value)}
              placeholder="User ID anggota MABA..."
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <Button
              size="sm"
              onClick={handleAddMember}
              disabled={addingMember || !newMemberUserId.trim()}
              className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Tambah
            </Button>
          </div>
        </div>
      )}

      {/* Daftar anggota */}
      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-sky-50 dark:border-sky-900">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Anggota Aktif ({activeMembers.length})
          </h2>
        </div>
        {activeMembers.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Belum ada anggota aktif di grup ini.
          </div>
        ) : (
          <ul className="divide-y divide-sky-50 dark:divide-sky-900">
            {activeMembers.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {m.user.displayName ?? m.user.fullName}
                  </p>
                  <p className="text-xs text-gray-400">{m.user.nrp} &bull; {m.memberType}</p>
                </div>
                {group.status !== 'ARCHIVED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleRemoveMember(m)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog />
    </div>
  );
}
