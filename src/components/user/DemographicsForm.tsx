'use client';

/**
 * DemographicsForm
 * Reusable form for updating user demographics (opt-in).
 * Includes transparency notice about data access.
 */

import { useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('demographics-form');

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

interface DemographicsData {
  province?: string | null;
  isRantau?: boolean | null;
  isKIP?: boolean | null;
  hasDisability?: boolean | null;
  disabilityNotes?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelation?: string | null;
  emergencyContactPhone?: string | null;
}

interface Props {
  initial?: DemographicsData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function toBooleanField(v?: boolean | null): BooleanField {
  if (v == null) return 'not_set';
  return v ? 'true' : 'false';
}

function fromBooleanField(v: BooleanField): boolean | null {
  if (v === 'not_set') return null;
  return v === 'true';
}

export function DemographicsForm({ initial, onSuccess, onCancel }: Props) {
  const [province, setProvince] = useState(initial?.province ?? '');
  const [isRantau, setIsRantau] = useState<BooleanField>(toBooleanField(initial?.isRantau));
  const [isKIP, setIsKIP] = useState<BooleanField>(toBooleanField(initial?.isKIP));
  const [hasDisability, setHasDisability] = useState<BooleanField>(
    toBooleanField(initial?.hasDisability)
  );
  const [disabilityNotes, setDisabilityNotes] = useState(initial?.disabilityNotes ?? '');
  const [emergencyName, setEmergencyName] = useState(initial?.emergencyContactName ?? '');
  const [emergencyRelation, setEmergencyRelation] = useState(
    initial?.emergencyContactRelation ?? ''
  );
  const [emergencyPhone, setEmergencyPhone] = useState(initial?.emergencyContactPhone ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      log.info('Saving demographics');
      const res = await fetch('/api/users/me/demographics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          province: province || null,
          isRantau: fromBooleanField(isRantau),
          isKIP: fromBooleanField(isKIP),
          hasDisability: fromBooleanField(hasDisability),
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
      toast.success('Data demografi berhasil disimpan');
      onSuccess?.();
    } catch (err) {
      log.error('Failed to save demographics', { err });
      toast.error('Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Alert className="border border-sky-300 bg-sky-50 dark:bg-sky-950 dark:border-sky-800">
        <Info className="h-4 w-4 text-sky-600" />
        <AlertDescription className="text-sky-800 dark:text-sky-200 text-sm">
          <strong>Transparansi akses:</strong> Data demografi dapat dilihat oleh SC, SATGAS, ELDER,
          PEMBINA, dan BLM. Kontak darurat hanya dapat dilihat oleh SC, SATGAS, dan SUPERADMIN,
          dan setiap akses dicatat dalam audit log. Semua field bersifat opsional.
        </AlertDescription>
      </Alert>

      {/* Domisili */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Informasi Domisili
        </h3>

        <div className="space-y-1">
          <Label>Provinsi Asal</Label>
          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger>
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
          label="Mahasiswa Rantau"
          value={isRantau}
          onChange={setIsRantau}
          description="Apakah Anda tinggal di luar kota asal selama kuliah di ITS?"
        />

        <BooleanSelect
          label="Penerima KIP"
          value={isKIP}
          onChange={setIsKIP}
          description="Apakah Anda penerima Kartu Indonesia Pintar?"
        />
      </div>

      {/* Aksesibilitas */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Aksesibilitas</h3>

        <BooleanSelect
          label="Memiliki Disabilitas"
          value={hasDisability}
          onChange={setHasDisability}
        />

        {hasDisability === 'true' && (
          <div className="space-y-1">
            <Label>Catatan Disabilitas</Label>
            <Textarea
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
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Kontak Darurat</h3>

        <Alert className="border border-amber-300 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-xs">
            Hanya dapat dilihat oleh SC, SATGAS, dan SUPERADMIN. Setiap akses dicatat.
          </AlertDescription>
        </Alert>

        <div className="space-y-1">
          <Label>Nama Kontak</Label>
          <Input
            placeholder="Nama orang tua / wali"
            value={emergencyName}
            onChange={(e) => setEmergencyName(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-1">
          <Label>Hubungan</Label>
          <Input
            placeholder="Ibu, Ayah, Kakak, dll."
            value={emergencyRelation}
            onChange={(e) => setEmergencyRelation(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="space-y-1">
          <Label>Nomor Telepon</Label>
          <Input
            placeholder="08XXXXXXXXXX"
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            maxLength={20}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Simpan
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Batal
          </Button>
        )}
      </div>
    </div>
  );
}

function BooleanSelect({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: BooleanField;
  onChange: (v: BooleanField) => void;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <Select value={value} onValueChange={(v) => onChange(v as BooleanField)}>
        <SelectTrigger>
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
