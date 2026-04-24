'use client';

/**
 * UserDetailCard
 * Reusable card showing a user's sanitized info.
 * Respects field-level access: demographics and emergency contact
 * are only shown if the API returned them.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Phone, MapPin, AlertCircle } from 'lucide-react';

interface Demographics {
  isRantau?: boolean | null;
  isKIP?: boolean | null;
  hasDisability?: boolean | null;
  disabilityNotes?: string | null;
  province?: string | null;
  demographicsUpdatedAt?: string | null;
}

interface EmergencyContact {
  name?: string | null;
  relation?: string | null;
  phone?: string | null;
}

export interface UserDetailData {
  id: string;
  email: string;
  fullName: string;
  displayName?: string | null;
  nrp?: string | null;
  role: string;
  status: string;
  createdAt: string;
  demographics?: Demographics | null;
  emergencyContact?: EmergencyContact | null;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-500 min-w-[140px]">{label}</span>
      <span className="text-sm font-medium text-right flex-1">{value ?? '—'}</span>
    </div>
  );
}

interface Props {
  user: UserDetailData;
  showEmergencyAuditWarning?: boolean;
}

export function UserDetailCard({ user, showEmergencyAuditWarning = true }: Props) {
  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-sky-500" />
            Informasi Pengguna
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold">{user.fullName}</div>
              {user.displayName && (
                <div className="text-sm text-gray-500">{user.displayName}</div>
              )}
              <Badge className="mt-1 text-xs bg-sky-100 text-sky-800 border-sky-300">
                {user.role}
              </Badge>
            </div>
          </div>
          <div className="space-y-0">
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="NRP" value={user.nrp} />
            <InfoRow label="Status" value={user.status} />
            <InfoRow
              label="Bergabung"
              value={new Date(user.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Demographics (only rendered if returned by API) */}
      {user.demographics !== undefined && (
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-sky-500" />
              Demografi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.demographics ? (
              <div className="space-y-0">
                <InfoRow label="Provinsi Asal" value={user.demographics.province} />
                <InfoRow
                  label="Mahasiswa Rantau"
                  value={user.demographics.isRantau != null
                    ? (user.demographics.isRantau ? 'Ya' : 'Tidak')
                    : null}
                />
                <InfoRow
                  label="KIP"
                  value={user.demographics.isKIP != null
                    ? (user.demographics.isKIP ? 'Ya' : 'Tidak')
                    : null}
                />
                <InfoRow
                  label="Disabilitas"
                  value={user.demographics.hasDisability != null
                    ? (user.demographics.hasDisability ? 'Ya' : 'Tidak')
                    : null}
                />
                {user.demographics.disabilityNotes && (
                  <InfoRow
                    label="Catatan Disabilitas"
                    value={user.demographics.disabilityNotes}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Data demografi belum diisi</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Emergency Contact (only rendered if returned by API) */}
      {user.emergencyContact !== undefined && (
        <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-sky-500" />
              Kontak Darurat
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showEmergencyAuditWarning && (
              <Alert className="border border-amber-300 bg-amber-50 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 text-xs">
                  Akses ke data ini dicatat dalam audit log.
                </AlertDescription>
              </Alert>
            )}
            {user.emergencyContact?.name ? (
              <div className="space-y-0">
                <InfoRow label="Nama" value={user.emergencyContact.name} />
                <InfoRow label="Hubungan" value={user.emergencyContact.relation} />
                <InfoRow label="Telepon" value={user.emergencyContact.phone} />
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Kontak darurat belum diisi</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
