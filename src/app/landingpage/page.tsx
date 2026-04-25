'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BookOpen,
  Heart,
  ShieldAlert,
  ClipboardList,
  Flame,
  Map,
  FileText,
  Users,
  BarChart2,
  ClipboardCheck,
  Eye,
  Layers,
  Calendar,
  Award,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import { Navbar } from '@/components/website/Navbar';
import { Footer } from '@/components/website/Footer';

// --- Capability data grouped by audience ---

const MABA_CAPS = [
  {
    icon: BookOpen,
    label: 'Passport Digital',
    desc: 'Catat dan lacak seluruh kegiatan wajib pengaderan dalam satu dokumen digital.',
  },
  {
    icon: Flame,
    label: 'Pulse Check Harian',
    desc: 'Isikan suasana hati tiap hari; sistem mencatat streak konsistensimu.',
  },
  {
    icon: FileText,
    label: 'Jurnal Mingguan',
    desc: 'Refleksi tertulis What Happened / So What / Now What yang dinilai Kakak Pembimbing.',
  },
  {
    icon: Map,
    label: 'Life Map & Time Capsule',
    desc: 'Rancang peta kehidupan dan titipkan pesan untuk diri sendiri di masa depan.',
  },
  {
    icon: Heart,
    label: 'Skrining Kesehatan Mental',
    desc: 'Isi skrining rahasia; akses sumber daya self-care dan kontak konselor tersedia 24/7.',
  },
  {
    icon: Calendar,
    label: 'Katalog & RSVP Kegiatan',
    desc: 'Lihat jadwal semua kegiatan angkatan dan konfirmasi kehadiranmu.',
  },
  {
    icon: ShieldAlert,
    label: 'Lapor Anonim',
    desc: 'Laporkan insiden atau pelanggaran tanpa perlu login; pantau status dengan kode unik.',
  },
];

const PENGADER_CAPS = [
  {
    icon: Users,
    label: 'Kelola Grup & Adik Asuh',
    desc: 'KP: pantau semua anggota grup. KASUH: dampingi adik asuh dengan logbook siklus.',
  },
  {
    icon: BarChart2,
    label: 'Monitor Mood Kelompok',
    desc: 'Lihat distribusi mood harian grup secara real-time; red flag muncul otomatis.',
  },
  {
    icon: ClipboardList,
    label: 'Log Harian & Debrief Mingguan',
    desc: 'Isi stand-up log KP harian dan ringkasan debrief mingguan dalam satu alur.',
  },
  {
    icon: ClipboardCheck,
    label: 'Nilai Jurnal MABA',
    desc: 'Tinjau dan beri nilai rubrik jurnal mingguan anggota langsung dari dashboard.',
  },
  {
    icon: Calendar,
    label: 'Manajemen Kegiatan (OC)',
    desc: 'OC: kelola kegiatan sebagai PIC, lihat evaluasi NPS, dan jadwal mendatang.',
  },
  {
    icon: MessageSquare,
    label: 'Peer Debrief Antar-KP',
    desc: 'Baca ringkasan debrief rekan KP satu kohort untuk berbagi wawasan.',
  },
  {
    icon: Award,
    label: 'Safe Word (M10)',
    desc: 'Aktifkan kata aman saat kondisi darurat; sistem mencatat dan mengalertkan tim.',
  },
];

const SENIOR_CAPS = [
  {
    icon: Layers,
    label: 'Snapshot Agregat Angkatan (SC)',
    desc: 'Kirkpatrick 4-level, kepatuhan dokumen, dan mood kolektif dalam satu layar.',
  },
  {
    icon: BarChart2,
    label: 'Monitor Mood Live',
    desc: 'Data mood angkatan diperbarui tiap 60 detik tanpa perlu refresh halaman.',
  },
  {
    icon: Eye,
    label: 'Triage Laporan Anonim (BLM)',
    desc: 'Terima, tinjau, dan eskalasi laporan anonim ke Satgas sesuai tingkat keparahan.',
  },
  {
    icon: ClipboardCheck,
    label: 'Review Triwulan & Tanda Tangan',
    desc: 'SC buat narasi → Pembina tanda tangan → BLM audit substansi, semua dalam satu alur.',
  },
  {
    icon: ShieldAlert,
    label: 'Kepatuhan Permen 55',
    desc: 'Indikator kepatuhan hukum untuk SATGAS dan Pembina: pakta, passport, jurnal.',
  },
  {
    icon: UserCheck,
    label: 'Profil & Whitelist Akun',
    desc: 'Pembina / SC: kelola daftar akun yang diizinkan masuk ke sistem NAWASENA.',
  },
];

// --- Section component ---

interface CapItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
}

function CapabilityRow({ item }: { item: CapItem }) {
  const Icon = item.icon;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 p-2 rounded-xl bg-sky-50 dark:bg-sky-900/20 shrink-0">
        <Icon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
      </div>
    </div>
  );
}

interface AudienceSectionProps {
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  items: CapItem[];
  accentBorder: string;
}

function AudienceSection({ badge, badgeColor, title, subtitle, items, accentBorder }: AudienceSectionProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border-l-4 ${accentBorder} border border-sky-100 dark:border-sky-900 shadow-sm p-6`}>
      <div className="mb-5">
        <span className={`inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${badgeColor}`}>
          {badge}
        </span>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <CapabilityRow key={item.label} item={item} />
        ))}
      </div>
    </div>
  );
}

// --- Main page ---

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {/* Hero */}
        <section className="bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 py-20 px-4 text-center">
          <div className="container mx-auto max-w-3xl">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/40 px-3 py-1 rounded-full mb-4">
              NAWASENA 2026
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
              Sistem Informasi<br />Pengaderan ITS
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Platform digital resmi pengaderan mahasiswa baru ITS — menghubungkan MABA,
              pengader, dan senior dalam satu ekosistem yang terintegrasi, aman, dan
              berorientasi pada perkembangan mahasiswa.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-md active:scale-[0.97] transition-transform"
              >
                <Link href="/auth/login">
                  Masuk ke NAWASENA <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="bg-transparent border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 active:scale-[0.97] transition-transform"
              >
                <Link href="/kegiatan">Lihat Katalog Kegiatan</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Public-access quick links */}
        <section className="py-12 px-4 bg-white dark:bg-slate-900">
          <div className="container mx-auto max-w-4xl">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">
              Akses Tanpa Login
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: '/kegiatan', icon: BookOpen, label: 'Katalog Kegiatan', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { href: '/mental-health', icon: Heart, label: 'Kesehatan Mental', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                { href: '/anon-report', icon: ShieldAlert, label: 'Lapor Anonim', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                { href: '/anon-status', icon: ClipboardList, label: 'Cek Status Laporan', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-800 hover:shadow-md transition-all active:scale-[0.97] text-center min-h-[44px]"
                  >
                    <div className={`p-2.5 rounded-xl ${item.bg}`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Capability sections per audience */}
        <section className="py-16 px-4 bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Apa yang bisa dilakukan di NAWASENA?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xl mx-auto">
                Fitur dirancang khusus sesuai peran — setiap pemangku kepentingan
                mendapat tampilan dan alat yang relevan dengan tanggung jawabnya.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AudienceSection
                badge="Untuk MABA"
                badgeColor="text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/40"
                title="Mahasiswa Baru"
                subtitle="Kelola perjalanan pengaderanmu secara mandiri dan terstruktur."
                items={MABA_CAPS}
                accentBorder="border-l-sky-500"
              />
              <AudienceSection
                badge="Untuk Pengader"
                badgeColor="text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40"
                title="KP / KASUH / OC"
                subtitle="Alat pendampingan, pelaporan, dan pengelolaan kegiatan angkatan."
                items={PENGADER_CAPS}
                accentBorder="border-l-emerald-500"
              />
              <AudienceSection
                badge="Untuk Senior"
                badgeColor="text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/40"
                title="SC / Pembina / BLM / Satgas"
                subtitle="Kendali program, pengawasan kepatuhan, dan tanda tangan resmi."
                items={SENIOR_CAPS}
                accentBorder="border-l-violet-500"
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 px-4 bg-gradient-to-r from-sky-500 to-blue-600">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Mahasiswa Baru ITS 2026?
            </h2>
            <p className="text-sm text-white/80 mb-8 max-w-lg mx-auto">
              Login dengan akun ITS untuk mengakses passport digital, logbook KP,
              jurnal mingguan, dan semua fitur pengaderan NAWASENA.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                asChild
                size="lg"
                className="bg-white text-sky-700 hover:bg-sky-50 font-semibold shadow-md active:scale-[0.97] transition-transform"
              >
                <Link href="/auth/login">
                  Login Sekarang <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="bg-transparent border-white/40 text-white hover:bg-white/10 active:scale-[0.97] transition-transform"
              >
                <Link href="/anon-report">Lapor Anonim</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
