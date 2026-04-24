'use client';

/**
 * /dashboard/relasi
 * MABA — melihat 3 relasi pairing mereka: KP Group, Buddy, Kasuh.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Network, Users2, Heart, MessageCircle, ClipboardList } from 'lucide-react';

const log = createLogger('relasi-page');

interface SanitizedUser {
  id: string;
  fullName: string;
  displayName?: string | null;
  nrp?: string | null;
  role: string;
  province?: string | null;
  interests?: string[] | null;
  phone?: string | null;
  isRantau?: boolean | null;
  isKIP?: boolean | null;
}

interface RelationsData {
  kpGroup: {
    id: string;
    code: string;
    name: string;
    coordinator: SanitizedUser | null;
    members: SanitizedUser[];
    memberCount: number;
  } | null;
  buddyPair: {
    id: string;
    buddies: SanitizedUser[];
  } | null;
  kasuhPair: {
    pairId: string;
    kasuh: SanitizedUser;
    cohort: { id: string; code: string; name: string };
  } | null;
}

function UserCard({ user, showContact = false }: { user: SanitizedUser; showContact?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
        {(user.displayName ?? user.fullName).charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {user.displayName ?? user.fullName}
        </p>
        <p className="text-xs text-gray-400">{user.nrp} &bull; {user.province ?? 'Provinsi N/A'}</p>
        {user.interests && user.interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {user.interests.slice(0, 3).map((i) => (
              <span key={i} className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 px-1.5 py-0.5 rounded-full">
                {i}
              </span>
            ))}
          </div>
        )}
      </div>
      {showContact && user.phone && (
        <a
          href={`https://wa.me/${user.phone.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-200 transition-colors"
          title="WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

export default function RelasiPage() {
  const router = useRouter();
  const [relations, setRelations] = useState<RelationsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelations() {
      try {
        log.info('Fetching MABA relations');
        const res = await fetch('/api/pairing/my-relations');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setRelations(json.data);
      } catch (err) {
        log.error('Failed to fetch relations', { err });
        toast.error('Gagal memuat data relasi');
      } finally {
        setLoading(false);
      }
    }
    fetchRelations();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Network className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Relasi Saya</h1>
          <p className="text-sm text-gray-500">Kelompok Pendamping, Buddy, dan Kakak Asuh</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* KP Group Card */}
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-sky-500 to-blue-600">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-white" />
              <p className="text-sm font-semibold text-white">KP Group</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {relations?.kpGroup ? (
              <>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{relations.kpGroup.name}</p>
                  <Badge className="text-xs bg-sky-100 text-sky-800 border-sky-200 mt-1">{relations.kpGroup.code}</Badge>
                  <p className="text-xs text-gray-400 mt-1">{relations.kpGroup.memberCount} anggota</p>
                </div>
                {relations.kpGroup.coordinator && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Koordinator KP</p>
                    <UserCard user={relations.kpGroup.coordinator} />
                  </div>
                )}
                {relations.kpGroup.members.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Anggota lain ({relations.kpGroup.members.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {relations.kpGroup.members.map((m) => (
                        <UserCard key={m.id} user={m} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">
                Kamu belum masuk ke KP Group manapun.
              </p>
            )}
          </div>
        </div>

        {/* Buddy Pair Card */}
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-violet-500 to-blue-500">
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-white" />
              <p className="text-sm font-semibold text-white">Buddy</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {relations?.buddyPair && relations.buddyPair.buddies.length > 0 ? (
              <>
                <p className="text-xs text-gray-500">Teman dari jurusan berbeda</p>
                <div className="space-y-2">
                  {relations.buddyPair.buddies.map((b) => (
                    <UserCard key={b.id} user={b} />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">
                Kamu belum memiliki buddy pair.
              </p>
            )}
          </div>
        </div>

        {/* Kasuh Card */}
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-sky-500 to-blue-600">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-white" />
              <p className="text-sm font-semibold text-white">Kakak Asuh</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {relations?.kasuhPair ? (
              <>
                <p className="text-xs text-gray-500">Kakak yang mendampingimu</p>
                <UserCard user={relations.kasuhPair.kasuh} showContact={!!relations.kasuhPair.kasuh.phone} />
                {/* Re-pair request button */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                    onClick={() => router.push('/dashboard/kakak-c/request')}
                  >
                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                    Ajukan Pergantian Kasuh
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">
                Kamu belum memiliki Kakak Asuh.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
