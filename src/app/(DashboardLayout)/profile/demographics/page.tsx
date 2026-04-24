'use client';

/**
 * /profile/demographics
 * User-facing demographics form (opt-in).
 * All fields nullable — user can skip.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Shield, Info, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('profile-demographics-page');

type BooleanField = 'true' | 'false' | 'not_set';

const INDONESIAN_PROVINCES = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi',
  'Sumatera Selatan', 'Bengkulu', 'Lampung', 'Kepulauan Bangka Belitung',
  'Kepulauan Riau', 'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah',
  'DI Yogyakarta', 'Jawa Timur', 'Banten', 'Bali', 'Nusa Tenggara Barat',
  'Nusa Tenggara Timur', 'Kalimantan Barat', 'Kalimantan Tengah',
  'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan',
  'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat', 'Maluku',
  'Maluku Utara', 'Papua Barat', 'Papua',
];

export default function DemographicsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [province, setProvince] = useState('');
  const [isRantau, setIsRantau] = useState<BooleanField>('not_set');
  const [isKIP, setIsKIP] = useState<BooleanField>('not_set');
  const [hasDisability, setHasDisability] = useState<BooleanField>('not_set');
  const [disabilityNotes, setDisabilityNotes] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  useEffect(() => {
    async function fetchMe() {
      try {
        log.info('Fetching demographics');
        const res = await fetch('/api/users/me');
        if (!res.ok) return;
        const json = await res.json();
        const me = json.data;
        // Prefill if user already has demographics
        if (me.province) setProvince(me.province);
        if (me.isRantau != null) setIsRantau(me.isRantau ? 'true' : 'false');
        if (me.isKIP != null) setIsKIP(me.isKIP ? 'true' : 'false');
        if (me.hasDisability != null) setHasDisability(me.hasDisability ? 'true' : 'false');
        if (me.disabilityNotes) setDisabilityNotes(me.disabilityNotes);
        if (me.emergencyContactName) setEmergencyName(me.emergencyContactName);
        if (me.emergencyContactRelation) setEmergencyRelation(me.emergencyContactRelation);
        if (me.emergencyContactPhone) setEmergencyPhone(me.emergencyContactPhone);
      } catch (err) {
        log.error('Failed to fetch demographics', { err });
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, []);

  const toBoolean = (v: BooleanField): boolean | null =>
    v === 'not_set' ? null : v === 'true';

  async function handleSubmit() {
    setSubmitting(true);
    try {
      log.info('Saving demographics');
      const res = await fetch('/api/users/me/demographics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          province: province || null,
          isRantau: toBoolean(isRantau),
          isKIP: toBoolean(isKIP),
          hasDisability: toBoolean(hasDisability),
          disabilityNotes: disabilityNotes || null,
          emergencyContactName: emergencyName || null,
          emergencyContactRelation: emergencyRelation || null,
          emergencyContactPhone: emergencyPhone || null,
        }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success('Informasi demografi berhasil disimpan');
      router.push('/');
    } catch (err) {
      log.error('Failed to save demographics', { err });
      toast.error('Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Data Diri & Demografi</h1>
          <p className="text-sm text-gray-500">Semua field bersifat opsional</p>
        </div>
      </div>

      <Alert className="border border-sky-300 bg-sky-50 dark:bg-sky-950 dark:border-sky-800">
        <Info className="h-4 w-4 text-sky-600" />
        <AlertDescription className="text-sky-800 dark:text-sky-200 text-sm">
          <strong>Transparansi akses:</strong> Data demografi dapat dilihat oleh SC, SATGAS, ELDER,
          PEMBINA, dan BLM. Kontak darurat hanya dapat dilihat oleh SC, SATGAS, dan SUPERADMIN,
          dan setiap akses dicatat dalam audit log. Semua field bersifat opsional.
        </AlertDescription>
      </Alert>

      <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Informasi Domisili</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="province">Provinsi Asal</Label>
            <Select value={province} onValueChange={setProvince}>
              <SelectTrigger id="province">
                <SelectValue placeholder="Pilih provinsi" />
              </SelectTrigger>
              <SelectContent>
                {INDONESIAN_PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <BooleanSelect
            id="isRantau"
            label="Mahasiswa Rantau"
            value={isRantau}
            onChange={setIsRantau}
            description="Apakah Anda tinggal di luar kota asal selama kuliah di ITS?"
          />

          <BooleanSelect
            id="isKIP"
            label="Penerima KIP"
            value={isKIP}
            onChange={setIsKIP}
            description="Apakah Anda penerima Kartu Indonesia Pintar?"
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Aksesibilitas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BooleanSelect
            id="hasDisability"
            label="Memiliki Disabilitas"
            value={hasDisability}
            onChange={setHasDisability}
          />

          {hasDisability === 'true' && (
            <div className="space-y-1">
              <Label htmlFor="disabilityNotes">Catatan Disabilitas</Label>
              <Textarea
                id="disabilityNotes"
                placeholder="Jelaskan kebutuhan aksesibilitas Anda..."
                value={disabilityNotes}
                onChange={(e) => setDisabilityNotes(e.target.value)}
                rows={3}
                className="resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-400">{disabilityNotes.length}/500</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-sky-100 dark:border-sky-900 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Kontak Darurat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border border-amber-300 bg-amber-50">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-xs">
              Kontak darurat hanya dapat dilihat oleh SC, SATGAS, dan SUPERADMIN dalam situasi
              mendesak. Setiap akses dicatat dalam audit log.
            </AlertDescription>
          </Alert>

          <div className="space-y-1">
            <Label htmlFor="emergencyName">Nama Kontak</Label>
            <Input
              id="emergencyName"
              placeholder="Nama orang tua / wali"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="emergencyRelation">Hubungan</Label>
            <Input
              id="emergencyRelation"
              placeholder="Ibu, Ayah, Kakak, dll."
              value={emergencyRelation}
              onChange={(e) => setEmergencyRelation(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="emergencyPhone">Nomor Telepon</Label>
            <Input
              id="emergencyPhone"
              placeholder="08XXXXXXXXXX"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              maxLength={20}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Simpan Data
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          disabled={submitting}
        >
          Lewati
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helper component                                                      */
/* ------------------------------------------------------------------ */

function BooleanSelect({
  id,
  label,
  value,
  onChange,
  description,
}: {
  id: string;
  label: string;
  value: BooleanField;
  onChange: (v: BooleanField) => void;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <Select value={value} onValueChange={(v) => onChange(v as BooleanField)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Pilih jawaban" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="not_set">Tidak ingin menjawab</SelectItem>
          <SelectItem value="true">Ya</SelectItem>
          <SelectItem value="false">Tidak</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
