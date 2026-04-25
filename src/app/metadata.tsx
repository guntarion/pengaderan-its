import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'NAWASENA — Pengaderan ITS',
    template: '%s | NAWASENA',
  },
  description:
    'Platform pengaderan terpadu Institut Teknologi Sepuluh Nopember. Pendampingan mahasiswa baru, pulse harian, passport digital, kegiatan, kesehatan mental, dan kanal pelaporan anonim — dalam satu sistem yang aman dan reflektif.',
  keywords: [
    'NAWASENA',
    'Pengaderan ITS',
    'Mahasiswa Baru ITS',
    'Pakta Komitmen',
    'Passport Digital',
    'Pulse Journal',
    'Kesehatan Mental Mahasiswa',
    'Lapor Anonim',
    'Institut Teknologi Sepuluh Nopember',
  ],
  authors: [{ name: 'Tim NAWASENA ITS' }],
  creator: 'Institut Teknologi Sepuluh Nopember',
  publisher: 'Institut Teknologi Sepuluh Nopember',
  applicationName: 'NAWASENA',
  manifest: '/manifest.json',
  themeColor: '#0ea5e9',
  category: 'education',
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://nawasena.its.ac.id',
    title: 'NAWASENA — Pengaderan ITS',
    description:
      'Platform pengaderan terpadu ITS untuk MABA, KP, KASUH, OC, SC, BLM, Pembina, Satgas, dan SAC. Aman, reflektif, terstruktur.',
    siteName: 'NAWASENA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NAWASENA — Pengaderan ITS',
    description:
      'Platform pengaderan terpadu Institut Teknologi Sepuluh Nopember.',
  },
  robots: {
    index: true,
    follow: true,
  },
};
