'use client';

/**
 * /dashboard/kp/group
 * KP Coordinator — melihat anggota grup KP mereka.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Users2, MapPin, ChevronRight } from 'lucide-react';

const log = createLogger('kp-group-page');

interface KPMember {
  id: string;
  fullName: string;
  displayName?: string | null;
  nrp?: string | null;
  role: string;
  province?: string | null;
}

interface KPGroupData {
  id: string;
  code: string;
  name: string;
  status: string;
  capacityTarget: number;
  capacityMax: number;
  memberCount: number;
  cohort: { id: string; code: string; name: string };
  members: KPMember[];
}

export default function KPGroupPage() {
  const [group, setGroup] = useState<KPGroupData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroup() {
      try {
        log.info('Fetching KP group data');
        const res = await fetch('/api/pairing/my-group');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setGroup(json.data ?? null);
      } catch (err) {
        log.error('Failed to fetch KP group', { err });
        toast.error('Gagal memuat data grup');
      } finally {
        setLoading(false);
      }
    }
    fetchGroup();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Users2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Grup Saya</h1>
          <p className="text-sm text-gray-500">Anggota Kelompok Pendamping</p>
        </div>
      </div>

      {!group ? (
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-12 text-center shadow-sm">
          <Users2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Belum ada grup aktif</h3>
          <p className="text-sm text-gray-400 mt-1">Anda belum ditugaskan sebagai koordinator KP Group yang aktif.</p>
        </div>
      ) : (
        <>
          {/* Group Info */}
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{group.name}</h2>
                  <Badge className="text-xs bg-sky-100 text-sky-800 border-sky-200">{group.code}</Badge>
                  <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">{group.status}</Badge>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  Kohort: {group.cohort.name} &bull; {group.memberCount} / {group.capacityMax} anggota
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span className="font-medium text-gray-700 dark:text-gray-300">{group.memberCount}</span>
                <span>anggota aktif</span>
              </div>
            </div>
          </div>

          {/* Member Grid */}
          {group.members.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
              <Users2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Belum ada anggota dalam grup ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.members.map((member) => (
                <Link
                  key={member.id}
                  href={`/dashboard/kp/group/${member.id}`}
                  className="block rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 shadow-sm hover:border-sky-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(member.displayName ?? member.fullName).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {member.displayName ?? member.fullName}
                      </p>
                      <p className="text-xs text-gray-400">{member.nrp ?? '-'}</p>
                      {member.province && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-400">{member.province}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-sky-500 transition-colors shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
