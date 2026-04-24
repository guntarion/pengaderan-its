/**
 * src/components/anon-report/AnonymityNotice.tsx
 * NAWASENA M12 — Anonymity guarantee banner for public form.
 *
 * Shows privacy guarantees P1-P7 in user-friendly language.
 * Used on landing page and form page.
 */

import { Shield, Lock, Eye, Clock, Trash2, Users, Scale } from 'lucide-react';

interface AnonymityNoticeProps {
  compact?: boolean;
}

const guarantees = [
  {
    icon: Shield,
    label: 'Tanpa nama atau identitas',
    detail: 'Sistem tidak menyimpan nama, email, atau nomor HP Anda.',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
  {
    icon: Lock,
    label: 'Tanpa alamat IP',
    detail: 'Alamat IP tidak disimpan di database. Hanya digunakan untuk batas pengiriman harian.',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
  },
  {
    icon: Eye,
    label: 'Kode penelusuran pribadi',
    detail: 'Hanya Anda yang memiliki kode NW-XXXXXXXX untuk melihat status laporan Anda.',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
  },
  {
    icon: Users,
    label: 'Akses terbatas',
    detail: 'Hanya BLM organisasi Anda dan Satgas PPKPT ITS yang dapat membaca laporan.',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
  },
  {
    icon: Clock,
    label: 'Retensi terbatas',
    detail: 'Isi laporan dihapus otomatis setelah 3 tahun sesuai kebijakan retensi.',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    icon: Trash2,
    label: 'Log audit tidak dapat diubah',
    detail: 'Siapa pun yang mengakses laporan Anda dicatat secara permanen.',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
  },
  {
    icon: Scale,
    label: 'Sesuai Permen 55/2024',
    detail: 'Sistem ini dirancang sesuai regulasi perlindungan data mahasiswa.',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
  },
];

export function AnonymityNotice({ compact = false }: AnonymityNoticeProps) {
  if (compact) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
        <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
        <div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
            Identitas Anda terlindungi
          </p>
          <p className="mt-0.5 text-xs text-green-700 dark:text-green-300">
            Tidak ada nama, email, atau IP yang disimpan. Kode laporan hanya Anda yang tahu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-green-100 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950/20">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/50">
          <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-green-900 dark:text-green-100">
            Jaminan Anonimitas
          </h3>
          <p className="text-xs text-green-700 dark:text-green-300">
            7 lapisan perlindungan identitas Anda
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {guarantees.map((g) => (
          <div
            key={g.label}
            className={`flex items-start gap-3 rounded-xl p-3 ${g.bg}`}
          >
            <g.icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${g.color}`} />
            <div>
              <p className={`text-xs font-semibold ${g.color}`}>{g.label}</p>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{g.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
