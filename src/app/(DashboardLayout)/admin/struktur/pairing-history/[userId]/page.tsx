'use client';

/**
 * /admin/struktur/pairing-history/[userId]
 * SC/OC/SUPERADMIN — timeline pairing history untuk seorang user.
 */

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { History, ArrowLeft } from 'lucide-react';

const log = createLogger('admin-pairing-history');

interface PairingHistoryData {
  userId: string;
  kasuhPairsMaba: Array<{
    id: string;
    status: string;
    matchScore: number;
    createdAt: string;
    archivedAt: string | null;
    endReason: string | null;
    kasuh: { id: string; fullName: string; displayName: string; nrp: string };
    cohort: { id: string; code: string };
  }>;
  kasuhPairsKasuh: Array<{
    id: string;
    status: string;
    createdAt: string;
    archivedAt: string | null;
    maba: { id: string; fullName: string; displayName: string; nrp: string };
    cohort: { id: string; code: string };
  }>;
  kpGroupMemberships: Array<{
    id: string;
    memberType: string;
    joinedAt: string;
    leftAt: string | null;
    kpGroup: { id: string; code: string; name: string };
    cohort: { id: string; code: string };
  }>;
  buddyPairMemberships: Array<{
    id: string;
    joinedAt: string;
    buddyPair: {
      id: string;
      status: string;
      createdAt: string;
      archivedAt: string | null;
      members: Array<{
        id: string;
        user: { id: string; fullName: string; displayName: string; nrp: string };
      }>;
    };
    cohort: { id: string; code: string };
  }>;
  pairingRequests: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
    resolutionNote: string | null;
    cohort: { id: string; code: string };
    resolvedBy: { id: string; fullName: string; displayName: string } | null;
  }>;
}

const statusColor = (s: string) => {
  switch (s) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'ARCHIVED': case 'REASSIGNED': return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'FULFILLED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
    case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function PairingHistoryPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<PairingHistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        log.info('Fetching pairing history', { userId });
        const res = await fetch(`/api/admin/struktur/pairing-history/${userId}`);
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setData(json.data);
      } catch (err) {
        log.error('Failed to fetch pairing history', { err });
        toast.error('Gagal memuat riwayat pairing');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb labels={{ [userId]: 'Riwayat' }} />
        <SkeletonCard />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <DynamicBreadcrumb />
        <p className="text-gray-500 mt-4">Data tidak ditemukan.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>
    );
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <DynamicBreadcrumb labels={{ [userId]: 'Riwayat Pairing' }} />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Riwayat Pairing</h1>
          <p className="text-sm text-gray-400 font-mono">{userId}</p>
        </div>
      </div>

      {/* KP Group memberships */}
      {data.kpGroupMemberships.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">KP Group</h2>
          {data.kpGroupMemberships.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{m.kpGroup.code} — {m.kpGroup.name}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(m.joinedAt)} {m.leftAt ? `→ ${formatDate(m.leftAt)}` : '(aktif)'}
                  &nbsp;&bull; {m.memberType}
                </p>
              </div>
              <Badge className="text-xs bg-sky-100 text-sky-800 border-sky-200">{m.cohort.code}</Badge>
            </div>
          ))}
        </section>
      )}

      {/* Buddy pairs */}
      {data.buddyPairMemberships.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Buddy Pair</h2>
          {data.buddyPairMemberships.map((m) => {
            const partners = m.buddyPair.members.filter((mem) => mem.user.id !== userId);
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Buddy: {partners.map((p) => p.user.displayName ?? p.user.fullName).join(' & ')}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(m.joinedAt)}</p>
                </div>
                <Badge className={`text-xs ${statusColor(m.buddyPair.status)}`}>{m.buddyPair.status}</Badge>
              </div>
            );
          })}
        </section>
      )}

      {/* Kasuh pairs as MABA */}
      {data.kasuhPairsMaba.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Kasuh (sebagai MABA)</h2>
          {data.kasuhPairsMaba.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Kasuh: {p.kasuh.displayName ?? p.kasuh.fullName}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(p.createdAt)} {p.archivedAt ? `→ ${formatDate(p.archivedAt)}` : '(aktif)'}
                  {p.endReason && ` — ${p.endReason}`}
                </p>
              </div>
              <Badge className={`text-xs ${statusColor(p.status)}`}>{p.status}</Badge>
            </div>
          ))}
        </section>
      )}

      {/* Kasuh pairs as KASUH */}
      {data.kasuhPairsKasuh.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Adik Asuh (sebagai Kasuh)</h2>
          {data.kasuhPairsKasuh.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  MABA: {p.maba.displayName ?? p.maba.fullName}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(p.createdAt)} {p.archivedAt ? `→ ${formatDate(p.archivedAt)}` : '(aktif)'}
                </p>
              </div>
              <Badge className={`text-xs ${statusColor(p.status)}`}>{p.status}</Badge>
            </div>
          ))}
        </section>
      )}

      {/* Pairing requests */}
      {data.pairingRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pairing Requests</h2>
          {data.pairingRequests.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {r.type === 'RE_PAIR_KASUH' ? 'Re-Pair Kasuh' : 'Kasuh Unreachable'}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(r.createdAt)}
                  {r.resolvedAt && ` → ${formatDate(r.resolvedAt)}`}
                  {r.resolvedBy && ` (oleh ${r.resolvedBy.displayName ?? r.resolvedBy.fullName})`}
                </p>
                {r.resolutionNote && <p className="text-xs text-gray-500 mt-0.5 italic">{r.resolutionNote}</p>}
              </div>
              <Badge className={`text-xs ${statusColor(r.status)}`}>{r.status}</Badge>
            </div>
          ))}
        </section>
      )}

      {data.kasuhPairsMaba.length === 0 &&
        data.kasuhPairsKasuh.length === 0 &&
        data.kpGroupMemberships.length === 0 &&
        data.buddyPairMemberships.length === 0 &&
        data.pairingRequests.length === 0 && (
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-8 text-center shadow-sm">
            <p className="text-gray-400 text-sm">Belum ada riwayat pairing untuk user ini.</p>
          </div>
        )}

      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Kembali
      </Button>
    </div>
  );
}
