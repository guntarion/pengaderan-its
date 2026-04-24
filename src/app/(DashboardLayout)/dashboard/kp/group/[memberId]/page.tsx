'use client';

/**
 * /dashboard/kp/group/[memberId]
 * KP Coordinator — detail anggota grup (sanitized, no KIP/emergency contact).
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { ArrowLeft, MapPin, Users2 } from 'lucide-react';

const log = createLogger('kp-member-detail');

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
  members: KPMember[];
}

export default function KPMemberDetailPage() {
  const params = useParams<{ memberId: string }>();
  const router = useRouter();
  const [member, setMember] = useState<KPMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMember() {
      try {
        log.info('Fetching KP group to find member', { memberId: params.memberId });
        const res = await fetch('/api/pairing/my-group');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        const groupData = json.data as KPGroupData | null;
        const found = groupData?.members.find((m) => m.id === params.memberId) ?? null;
        setMember(found);
      } catch (err) {
        log.error('Failed to fetch member detail', { err });
        toast.error('Gagal memuat data anggota');
      } finally {
        setLoading(false);
      }
    }
    fetchMember();
  }, [params.memberId]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <SkeletonCard />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-8 text-center">
          <p className="text-red-700 dark:text-red-300 text-sm">Anggota tidak ditemukan atau tidak ada di grup Anda.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb labels={{ [params.memberId]: member.displayName ?? member.fullName }} />

      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Daftar Grup
      </button>

      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-2xl shrink-0">
            {(member.displayName ?? member.fullName).charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {member.displayName ?? member.fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge className="text-xs bg-sky-100 text-sky-800 border-sky-200">{member.role}</Badge>
              {member.nrp && (
                <span className="text-sm text-gray-500 font-mono">{member.nrp}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {member.province && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
              <span>{member.province}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Users2 className="h-4 w-4 text-gray-400 shrink-0" />
            <span>Anggota KP Group</span>
          </div>
        </div>

        <div className="mt-6 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          Data anggota ditampilkan sesuai hak akses KP. Informasi demografis sensitif tidak ditampilkan di sini.
        </div>
      </div>
    </div>
  );
}
