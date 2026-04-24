'use client';

/**
 * /dashboard/kasuh/adik-asuh
 * KASUH — melihat daftar adik asuh mereka (1-2 MABA).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useConfirm } from '@/hooks/useConfirm';
import { Heart, MapPin, ChevronRight, PhoneOff } from 'lucide-react';
import { STRUKTUR_COPY } from '@/i18n/struktur-copy';
import { buildWhatsAppUrl } from '@/lib/contact/whatsapp';
import { MessageCircle } from 'lucide-react';

const log = createLogger('kasuh-adik-asuh-page');

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
  createdAt: string;
  maba: AdikAsuhMaba;
}

export default function AdikAsuhPage() {
  const [adikList, setAdikList] = useState<AdikAsuhItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    async function fetchAdik() {
      try {
        log.info('Fetching adik asuh data');
        const res = await fetch('/api/pairing/my-adik-asuh');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setAdikList(json.data ?? []);
      } catch (err) {
        log.error('Failed to fetch adik asuh', { err });
        toast.error('Gagal memuat data adik asuh');
      } finally {
        setLoading(false);
      }
    }
    fetchAdik();
  }, []);

  async function handleUnreachable(pairId: string, currentKasuhPairId: string) {
    const confirmed = await confirm({
      title: STRUKTUR_COPY.unreachableConfirm,
      description: STRUKTUR_COPY.unreachableDescription,
      confirmLabel: 'Ya, Laporkan',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      setReportingId(pairId);
      const res = await fetch('/api/pairing/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'KASUH_UNREACHABLE',
          currentKasuhPairId,
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
      setReportingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb />
      <ConfirmDialog />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Heart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Adik Asuh Saya</h1>
          <p className="text-sm text-gray-500">MABA yang kamu dampingi sebagai Kakak Asuh</p>
        </div>
      </div>

      {adikList.length === 0 ? (
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-12 text-center shadow-sm">
          <Heart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Belum ada adik asuh</h3>
          <p className="text-sm text-gray-400 mt-1">Kamu belum ditugaskan untuk mendampingi MABA manapun.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {adikList.map((item) => {
            const waUrl = item.maba.phone ? buildWhatsAppUrl(item.maba.phone, `Halo ${item.maba.displayName ?? item.maba.fullName}! Ini ${''} dari NAWASENA.`) : null;
            return (
              <div
                key={item.pairId}
                className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
              >
                <div className="p-4 bg-gradient-to-r from-sky-500 to-blue-600">
                  <p className="text-xs text-white/70 font-medium">Adik Asuh — {item.cohort.name}</p>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {(item.maba.displayName ?? item.maba.fullName).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {item.maba.displayName ?? item.maba.fullName}
                      </p>
                      <p className="text-sm text-gray-400 font-mono">{item.maba.nrp ?? '-'}</p>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-2 text-sm">
                    {item.maba.province && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                        <span>{item.maba.province}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {item.maba.isRantau !== null && item.maba.isRantau !== undefined && (
                        <Badge className={`text-xs ${item.maba.isRantau ? 'bg-violet-100 text-violet-800' : 'bg-gray-100 text-gray-700'}`}>
                          {item.maba.isRantau ? 'Rantau' : 'Lokal'}
                        </Badge>
                      )}
                      {item.maba.isKIP && (
                        <Badge className="text-xs bg-emerald-100 text-emerald-800">KIP</Badge>
                      )}
                    </div>
                    {item.maba.interests && item.maba.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.maba.interests.slice(0, 4).map((interest) => (
                          <span key={interest} className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 px-2 py-0.5 rounded-full">
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Link
                      href={`/dashboard/kasuh/adik-asuh/${item.maba.id}`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <ChevronRight className="h-4 w-4 mr-1.5" />
                        Lihat Profil Lengkap
                      </Button>
                    </Link>
                    {waUrl && (
                      <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button size="sm" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                          <MessageCircle className="h-4 w-4 mr-1.5" />
                          WhatsApp
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reportingId === item.pairId}
                      onClick={() => handleUnreachable(item.pairId, item.pairId)}
                      className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                    >
                      <PhoneOff className="h-4 w-4 mr-1.5" />
                      {STRUKTUR_COPY.unreachableButton}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
