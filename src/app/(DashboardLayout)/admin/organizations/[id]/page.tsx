'use client';

/**
 * /admin/organizations/[id]
 * Organization detail page (SUPERADMIN only).
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Building2, Users, Users2 } from 'lucide-react';

const log = createLogger('admin-org-detail');

interface Org {
  id: string;
  code: string;
  name: string;
  fullName: string;
  status: string;
  contactEmail: string | null;
  websiteUrl: string | null;
  createdAt: string;
  _count: { users: number; cohorts: number };
}

const statusColor = (s: string) =>
  s === 'ACTIVE'
    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
    : 'bg-gray-100 text-gray-700 border-gray-300';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-500 min-w-[140px]">{label}</span>
      <span className="text-sm font-medium text-right flex-1">{value ?? '—'}</span>
    </div>
  );
}

export default function OrgDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrgs() {
      try {
        log.info('Fetching organizations to find detail', { id: params.id });
        const res = await fetch('/api/admin/organizations');
        if (!res.ok) {
          toast.apiError(await res.json());
          router.push('/admin/organizations');
          return;
        }
        const json = await res.json();
        const found = (json.data ?? []).find((o: Org) => o.id === params.id);
        if (!found) {
          toast.error('Organisasi tidak ditemukan');
          router.push('/admin/organizations');
          return;
        }
        setOrg(found);
      } catch (err) {
        log.error('Failed to fetch org detail', { err });
        toast.error('Gagal memuat data organisasi');
      } finally {
        setLoading(false);
      }
    }
    fetchOrgs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb />
        <SkeletonCard />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb labels={{ [params.id]: org.name }} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{org.name}</h1>
              <Badge className={`text-xs ${statusColor(org.status)}`}>{org.status}</Badge>
            </div>
            <p className="text-sm text-gray-500">{org.fullName}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/organizations')}>
          Kembali
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-500" />
              <span className="text-3xl font-bold">{org._count.users}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total Kohort</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-sky-500" />
              <span className="text-3xl font-bold">{org._count.cohorts}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Kode</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold font-mono text-sky-600">{org.code}</span>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-xl rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h2 className="text-base font-semibold mb-3">Informasi Kontak</h2>
        <InfoRow label="Email Kontak" value={org.contactEmail} />
        <InfoRow label="Website" value={org.websiteUrl} />
        <InfoRow
          label="Dibuat"
          value={new Date(org.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        />
      </div>
    </div>
  );
}
