'use client';

/**
 * /admin/cohorts/[id]
 * Cohort detail page showing members and activation controls.
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { Users2, CheckCircle2, Calendar, Settings2 } from 'lucide-react';

const log = createLogger('admin-cohort-detail');

interface Cohort {
  id: string;
  code: string;
  name: string;
  status: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  _count: { users: number };
}

const statusColor = (s: string) => {
  switch (s) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'DRAFT': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'ARCHIVED': return 'bg-gray-100 text-gray-700 border-gray-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function CohortDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user: viewer } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const canManage = viewer?.role === 'SC' || viewer?.role === 'SUPERADMIN';

  async function fetchCohort() {
    try {
      log.info('Fetching cohorts to find detail', { id: params.id });
      const res = await fetch('/api/admin/cohorts');
      if (!res.ok) {
        toast.apiError(await res.json());
        router.push('/admin/cohorts');
        return;
      }
      const json = await res.json();
      const found = (json.data ?? []).find((c: Cohort) => c.id === params.id);
      if (!found) {
        toast.error('Kohort tidak ditemukan');
        router.push('/admin/cohorts');
        return;
      }
      setCohort(found);
    } catch (err) {
      log.error('Failed to fetch cohort', { err });
      toast.error('Gagal memuat data kohort');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCohort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleActivate() {
    if (!cohort) return;
    const confirmed = await confirm({
      title: `Aktifkan Kohort ${cohort.code}?`,
      description: 'Kohort yang sedang aktif akan dinonaktifkan. Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Aktifkan',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setActivating(true);
    try {
      const res = await fetch(`/api/admin/cohorts/${cohort.id}/activate`, { method: 'POST' });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success(`Kohort ${cohort.code} berhasil diaktifkan`);
      await fetchCohort();
    } catch (err) {
      log.error('Failed to activate cohort', { err });
      toast.error('Gagal mengaktifkan kohort');
    } finally {
      setActivating(false);
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

  if (!cohort) return null;

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb labels={{ [params.id]: cohort.name }} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <Users2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{cohort.name}</h1>
              {cohort.isActive && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  Aktif
                </span>
              )}
              <Badge className={`text-xs ${statusColor(cohort.status)}`}>{cohort.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 font-mono">{cohort.code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => router.push('/admin/cohorts')}>
            Kembali
          </Button>
          {canManage && (
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/cohorts/${params.id}/settings`)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Pengaturan
            </Button>
          )}
          {canManage && !cohort.isActive && cohort.status !== 'ARCHIVED' && (
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              onClick={handleActivate}
              disabled={activating}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aktifkan Kohort
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total Anggota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-sky-500" />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {cohort._count.users}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Periode Mulai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-500" />
              <span className="text-base font-semibold">
                {new Date(cohort.startDate).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Periode Selesai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-500" />
              <span className="text-base font-semibold">
                {new Date(cohort.endDate).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog />
    </div>
  );
}
