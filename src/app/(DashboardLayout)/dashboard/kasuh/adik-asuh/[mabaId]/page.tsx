'use client';

/**
 * /dashboard/kasuh/adik-asuh/[mabaId]
 * KASUH — detail profil adik asuh (full profile non-MH).
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useConfirm } from '@/hooks/useConfirm';
import { ArrowLeft, MapPin, Heart, PhoneOff, MessageCircle } from 'lucide-react';
import { STRUKTUR_COPY } from '@/i18n/struktur-copy';
import { buildWhatsAppUrl } from '@/lib/contact/whatsapp';

const log = createLogger('kasuh-adik-detail');

interface AdikAsuhMaba {
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

interface AdikAsuhItem {
  pairId: string;
  cohort: { id: string; code: string; name: string };
  matchScore: number;
  matchReasons: string[];
  maba: AdikAsuhMaba;
}

export default function AdikAsuhDetailPage() {
  const params = useParams<{ mabaId: string }>();
  const router = useRouter();
  const [item, setItem] = useState<AdikAsuhItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    async function fetchItem() {
      try {
        log.info('Fetching adik asuh list to find detail', { mabaId: params.mabaId });
        const res = await fetch('/api/pairing/my-adik-asuh');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        const list = json.data as AdikAsuhItem[];
        const found = list.find((x) => x.maba.id === params.mabaId) ?? null;
        setItem(found);
      } catch (err) {
        log.error('Failed to fetch adik asuh detail', { err });
        toast.error('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    }
    fetchItem();
  }, [params.mabaId]);

  async function handleUnreachable() {
    if (!item) return;
    const confirmed = await confirm({
      title: STRUKTUR_COPY.unreachableConfirm,
      description: STRUKTUR_COPY.unreachableDescription,
      confirmLabel: 'Ya, Laporkan',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      setReporting(true);
      const res = await fetch('/api/pairing/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'KASUH_UNREACHABLE',
          currentKasuhPairId: item.pairId,
        }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success('Laporan dikirim ke SC untuk ditindaklanjuti');
    } catch (err) {
      log.error('Failed to report unreachable', { err });
      toast.error('Gagal mengirim laporan');
    } finally {
      setReporting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <SkeletonCard />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-8 text-center">
          <p className="text-red-700 dark:text-red-300 text-sm">Adik asuh tidak ditemukan atau bukan adik asuh Anda.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  const waUrl = item.maba.phone
    ? buildWhatsAppUrl(item.maba.phone, `Halo ${item.maba.displayName ?? item.maba.fullName}! Salam dari NAWASENA.`)
    : null;

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb
        labels={{ [params.mabaId]: item.maba.displayName ?? item.maba.fullName }}
      />
      <ConfirmDialog />

      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Daftar Adik Asuh
      </button>

      {/* Profile Card */}
      <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-sky-500 to-blue-600">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-white" />
            <p className="text-sm font-semibold text-white">Adik Asuh — {item.cohort.name}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-2xl shrink-0">
              {(item.maba.displayName ?? item.maba.fullName).charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {item.maba.displayName ?? item.maba.fullName}
              </h1>
              <p className="text-sm text-gray-500 font-mono">{item.maba.nrp ?? '-'}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {item.maba.isRantau !== null && item.maba.isRantau !== undefined && (
                  <Badge className={`text-xs ${item.maba.isRantau ? 'bg-violet-100 text-violet-800' : 'bg-gray-100 text-gray-700'}`}>
                    {item.maba.isRantau ? 'Rantau' : 'Lokal'}
                  </Badge>
                )}
                {item.maba.isKIP && (
                  <Badge className="text-xs bg-emerald-100 text-emerald-800">KIP</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            {item.maba.province && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                <span>{item.maba.province}</span>
              </div>
            )}
            {item.maba.interests && item.maba.interests.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Minat &amp; Hobi</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.maba.interests.map((interest) => (
                    <span key={interest} className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 px-2.5 py-1 rounded-full">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Match info */}
          {item.matchReasons && item.matchReasons.length > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Alasan Pemasangan</p>
              <ul className="space-y-0.5">
                {item.matchReasons.map((r, i) => (
                  <li key={i} className="text-xs text-blue-600 dark:text-blue-300">&bull; {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl" size="sm">
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  WhatsApp
                </Button>
              </a>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={reporting}
              onClick={handleUnreachable}
              className="flex-1 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
            >
              <PhoneOff className="h-4 w-4 mr-1.5" />
              {STRUKTUR_COPY.unreachableButton}
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            Informasi yang ditampilkan dibatasi sesuai kebijakan privasi NAWASENA. Data kesehatan mental tidak ditampilkan.
          </p>
        </div>
      </div>
    </div>
  );
}
