'use client';

/**
 * /admin/users/[id]
 * User detail page with field-level access control.
 * Roles: SC, SUPERADMIN, PEMBINA, BLM, SATGAS
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { RoleAssignmentDialog } from '@/components/admin/RoleAssignmentDialog';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import {
  User,
  Mail,
  Hash,
  Shield,
  Phone,
  MapPin,
  AlertCircle,
} from 'lucide-react';

const log = createLogger('admin-user-detail');

interface UserDetail {
  id: string;
  email: string;
  fullName: string;
  displayName: string | null;
  nrp: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  organizationId: string | null;
  currentCohortId: string | null;
  paktaPanitiaStatus: string;
  socialContractStatus: string;
  paktaPengader2027Status: string;
  currentCohort: { code: string; name: string } | null;
  organization: { code: string; name: string } | null;
  // Demographics (only if viewer has access)
  demographics?: {
    isRantau?: boolean | null;
    isKIP?: boolean | null;
    hasDisability?: boolean | null;
    disabilityNotes?: string | null;
    province?: string | null;
    demographicsUpdatedAt?: string | null;
  } | null;
  // Emergency contact
  emergencyContact?: {
    name?: string | null;
    relation?: string | null;
    phone?: string | null;
  } | null;
}

const roleColor = (r: string) => {
  switch (r) {
    case 'SUPERADMIN': return 'bg-violet-100 text-violet-800 border-violet-300';
    case 'SC': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'PEMBINA': case 'BLM': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'SATGAS': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'ELDER': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'MABA': return 'bg-amber-100 text-amber-800 border-amber-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

const paktaStatusColor = (s: string) => {
  switch (s) {
    case 'SIGNED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
    case 'PENDING_RESIGN': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'NOT_REQUIRED': return 'bg-gray-100 text-gray-600 border-gray-300';
    default: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  }
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-500 min-w-[140px]">{label}</span>
      <span className="text-sm font-medium text-right flex-1">{value ?? '—'}</span>
    </div>
  );
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user: viewer } = useAuth();
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const canManageRole = viewer?.role === 'SC' || viewer?.role === 'SUPERADMIN';

  async function fetchUser() {
    try {
      log.info('Fetching user detail', { id: params.id });
      const res = await fetch(`/api/admin/users/${params.id}`);
      if (!res.ok) {
        toast.apiError(await res.json());
        router.push('/admin/users');
        return;
      }
      const json = await res.json();
      setUserDetail(json.data);
    } catch (err) {
      log.error('Failed to fetch user detail', { err });
      toast.error('Gagal memuat detail pengguna');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb labels={{ [params.id]: 'Detail Pengguna' }} />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!userDetail) return null;

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumb labels={{ [params.id]: userDetail.fullName }} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
            {userDetail.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{userDetail.fullName}</h1>
            {userDetail.displayName && (
              <p className="text-sm text-gray-500">{userDetail.displayName}</p>
            )}
          </div>
          <Badge className={`ml-2 ${roleColor(userDetail.role)}`}>{userDetail.role}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/users')}>
            Kembali
          </Button>
          {canManageRole && viewer?.id !== userDetail.id && (
            <Button
              className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
              onClick={() => setRoleDialogOpen(true)}
            >
              <Shield className="h-4 w-4 mr-2" />
              Ubah Role
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-sky-500" />
              Informasi Dasar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="Email" value={userDetail.email} />
            <InfoRow label="NRP" value={userDetail.nrp} />
            <InfoRow label="Status" value={userDetail.status} />
            <InfoRow label="Organisasi" value={userDetail.organization?.name} />
            <InfoRow label="Kohort" value={userDetail.currentCohort?.name} />
            <InfoRow
              label="Bergabung"
              value={new Date(userDetail.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            />
            <InfoRow
              label="Login Terakhir"
              value={userDetail.lastLoginAt
                ? new Date(userDetail.lastLoginAt).toLocaleString('id-ID')
                : null}
            />
          </CardContent>
        </Card>

        {/* Pakta Status */}
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-sky-500" />
              Status Pakta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Pakta Panitia', value: userDetail.paktaPanitiaStatus },
              { label: 'Social Contract', value: userDetail.socialContractStatus },
              { label: 'Pakta Pengader 2027', value: userDetail.paktaPengader2027Status },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                <Badge className={`text-xs ${paktaStatusColor(value)}`}>{value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Demographics — only shown if viewer has access */}
        {userDetail.demographics !== undefined && (
          <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-sky-500" />
                Demografi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userDetail.demographics ? (
                <div className="space-y-0">
                  <InfoRow
                    label="Provinsi Asal"
                    value={userDetail.demographics.province}
                  />
                  <InfoRow
                    label="Mahasiswa Rantau"
                    value={userDetail.demographics.isRantau != null
                      ? (userDetail.demographics.isRantau ? 'Ya' : 'Tidak')
                      : null}
                  />
                  <InfoRow
                    label="KIP"
                    value={userDetail.demographics.isKIP != null
                      ? (userDetail.demographics.isKIP ? 'Ya' : 'Tidak')
                      : null}
                  />
                  <InfoRow
                    label="Disabilitas"
                    value={userDetail.demographics.hasDisability != null
                      ? (userDetail.demographics.hasDisability ? 'Ya' : 'Tidak')
                      : null}
                  />
                  {userDetail.demographics.disabilityNotes && (
                    <InfoRow
                      label="Catatan Disabilitas"
                      value={userDetail.demographics.disabilityNotes}
                    />
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Belum diisi</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact — only shown if viewer has SC/SATGAS/SUPERADMIN access */}
        {userDetail.emergencyContact !== undefined && (
          <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4 text-sky-500" />
                Kontak Darurat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="border border-amber-300 bg-amber-50 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 text-xs">
                  Akses ke kontak darurat ini dicatat dalam audit log.
                </AlertDescription>
              </Alert>
              {userDetail.emergencyContact?.name ? (
                <div className="space-y-0">
                  <InfoRow label="Nama" value={userDetail.emergencyContact.name} />
                  <InfoRow label="Hubungan" value={userDetail.emergencyContact.relation} />
                  <InfoRow label="Telepon" value={userDetail.emergencyContact.phone} />
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Belum diisi</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Additional info cards for completeness */}
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="h-4 w-4 text-sky-500" />
              Identifikasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              <InfoRow label="ID Pengguna" value={userDetail.id} />
              <InfoRow label="ID Organisasi" value={userDetail.organizationId} />
              <InfoRow label="ID Kohort" value={userDetail.currentCohortId} />
            </div>
          </CardContent>
        </Card>
      </div>

      {canManageRole && viewer?.id !== userDetail.id && (
        <RoleAssignmentDialog
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          userId={userDetail.id}
          userFullName={userDetail.fullName}
          currentRole={userDetail.role as never}
          viewerRole={viewer.role as never}
          onSuccess={fetchUser}
        />
      )}
    </div>
  );
}
