'use client';

/**
 * src/components/notifications/UserPreferenceForm.tsx
 * NAWASENA M15 — User notification preference settings
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bell, Mail, MessageCircle, ShieldAlert, Loader2, Save, Info,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { PushPermissionPrompt } from './PushPermissionPrompt';
import { usePushSubscription } from '@/hooks/use-push-subscription';

const log = createLogger('user-preference-form');

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  digestMode: 'IMMEDIATE' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST';
  emailBouncedAt: string | null;
  updatedAt: string;
}

interface ChannelToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  bounced?: boolean;
}

function ChannelToggle({ icon, label, description, enabled, onChange, bounced }: ChannelToggleProps) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${enabled ? 'text-sky-500' : 'text-gray-300 dark:text-gray-600'}`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</Label>
            {bounced && (
              <Badge className="text-xs bg-red-100 text-red-700 border-red-300 border">
                Bounced — email terblokir
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 flex-shrink-0 mt-0.5 ${
          enabled ? 'bg-sky-500' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export function UserPreferenceForm() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isSubscribed } = usePushSubscription();

  useEffect(() => {
    async function fetchPrefs() {
      try {
        log.info('Fetching notification preferences');
        const res = await fetch('/api/notifications/preferences');
        if (!res.ok) {
          toast.apiError(await res.json());
          return;
        }
        const json = await res.json();
        setPrefs(json.data);
      } catch (err) {
        log.error('Failed to fetch preferences', { err });
        toast.error('Gagal memuat preferensi notifikasi');
      } finally {
        setLoading(false);
      }
    }
    fetchPrefs();
  }, []);

  async function handleSave() {
    if (!prefs) return;

    setSaving(true);
    try {
      log.info('Saving notification preferences');
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pushEnabled: prefs.pushEnabled,
          emailEnabled: prefs.emailEnabled,
          whatsappEnabled: prefs.whatsappEnabled,
          digestMode: prefs.digestMode,
        }),
      });

      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }

      const json = await res.json();
      setPrefs(json.data);
      toast.success('Preferensi notifikasi berhasil disimpan');
    } catch (err) {
      log.error('Failed to save preferences', { err });
      toast.error('Gagal menyimpan preferensi');
    } finally {
      setSaving(false);
    }
  }

  function update(key: keyof NotificationPreferences, value: boolean | string) {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: value });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!prefs) {
    return (
      <p className="text-sm text-gray-500">Gagal memuat preferensi. Silakan muat ulang halaman.</p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push subscription prompt if not subscribed */}
      {!isSubscribed && <PushPermissionPrompt />}

      {/* CRITICAL disclaimer */}
      <Alert className="border-2 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertDescription className="text-red-800 dark:text-red-300 text-sm">
          <strong>Notifikasi CRITICAL</strong> (Safeguard, MH alert, aksi darurat) selalu dikirim terlepas dari pengaturan di bawah ini.
          Hal ini demi keselamatan dan tidak dapat dinonaktifkan.
        </AlertDescription>
      </Alert>

      {/* Channel preferences */}
      <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Bell className="h-4 w-4 text-sky-500" />
            Channel Notifikasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelToggle
            icon={<Bell className="h-4 w-4" />}
            label="Push Notification"
            description="Notifikasi langsung di browser atau perangkat Anda"
            enabled={prefs.pushEnabled}
            onChange={(v) => update('pushEnabled', v)}
          />
          <ChannelToggle
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            description="Notifikasi dikirim ke alamat email terdaftar Anda"
            enabled={prefs.emailEnabled}
            onChange={(v) => update('emailEnabled', v)}
            bounced={!!prefs.emailBouncedAt}
          />
          <ChannelToggle
            icon={<MessageCircle className="h-4 w-4" />}
            label="WhatsApp"
            description="Notifikasi via WhatsApp (akan segera tersedia)"
            enabled={prefs.whatsappEnabled}
            onChange={(v) => update('whatsappEnabled', v)}
          />
        </CardContent>
      </Card>

      {/* Digest mode */}
      <Card className="rounded-2xl border-sky-100 dark:border-sky-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Info className="h-4 w-4 text-sky-500" />
            Mode Pengiriman
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Pilih apakah notifikasi dikirim langsung atau dikumpulkan dalam digest.
            Mode digest tidak berlaku untuk notifikasi CRITICAL.
          </p>
          <Select
            value={prefs.digestMode}
            onValueChange={(v) => update('digestMode', v)}
          >
            <SelectTrigger className="border-sky-200 dark:border-sky-800 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IMMEDIATE">Langsung — kirim segera</SelectItem>
              <SelectItem value="DAILY_DIGEST">Digest Harian — dikumpulkan per hari</SelectItem>
              <SelectItem value="WEEKLY_DIGEST">Digest Mingguan — dikumpulkan per minggu</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Bounce warning */}
      {prefs.emailBouncedAt && (
        <Alert className="border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
          <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
            Email Anda terdeteksi bounced pada{' '}
            {new Date(prefs.emailBouncedAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}.
            Pengiriman email dihentikan sementara untuk mencegah spam score.
            Hubungi administrator untuk mengembalikan status email Anda.
          </AlertDescription>
        </Alert>
      )}

      {/* Updated at */}
      <p className="text-xs text-gray-400">
        Terakhir diperbarui: {new Date(prefs.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>

      {/* Save button */}
      <Button
        className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {saving ? 'Menyimpan...' : 'Simpan Preferensi'}
      </Button>
    </div>
  );
}
