import React from 'react';
import Link from 'next/link';
import { Mail, MapPin, Phone, AlertTriangle } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/landingpage" className="inline-block mb-4">
              <span className="text-2xl font-bold text-primary">NAWASENA</span>
            </Link>
            <p className="text-gray-600 mb-2 text-sm font-medium">
              Sistem Pengaderan ITS
            </p>
            <p className="text-gray-600 mb-4 text-sm">
              Platform terpadu pendampingan mahasiswa baru ITS — mendukung
              perjalanan pengaderan yang aman, terstruktur, dan reflektif.
            </p>
            <p className="text-gray-500 text-xs">
              Institut Teknologi Sepuluh Nopember
            </p>
          </div>

          {/* Layanan Publik */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Layanan Publik
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/kegiatan"
                  className="text-gray-600 hover:text-primary text-sm"
                >
                  Katalog Kegiatan
                </Link>
              </li>
              <li>
                <Link
                  href="/mental-health"
                  className="text-gray-600 hover:text-primary text-sm"
                >
                  Pusat Kesehatan Mental
                </Link>
              </li>
              <li>
                <Link
                  href="/anon-report"
                  className="text-gray-600 hover:text-primary text-sm"
                >
                  Lapor Anonim
                </Link>
              </li>
              <li>
                <Link
                  href="/anon-status"
                  className="text-gray-600 hover:text-primary text-sm"
                >
                  Cek Status Laporan
                </Link>
              </li>
            </ul>
          </div>

          {/* Akun & Privasi */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Akun & Privasi
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/auth/login"
                  className="text-gray-600 hover:text-primary text-sm"
                >
                  Masuk
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-primary text-sm"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/pakta"
                  className="text-gray-600 hover:text-primary text-sm"
                >
                  Pakta Komitmen
                </Link>
              </li>
              <li>
                <Link
                  href="/mental-health/faq"
                  className="text-gray-600 hover:text-primary text-sm"
                >
                  Kebijakan Privasi
                </Link>
              </li>
            </ul>
          </div>

          {/* Kontak & Bantuan */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Kontak & Bantuan
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-gray-600 text-sm">
                <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                <span>
                  Kampus ITS Sukolilo, Surabaya 60111
                </span>
              </li>
              <li className="flex items-start gap-2 text-gray-600 text-sm">
                <Mail size={16} className="mt-0.5 flex-shrink-0" />
                <a
                  href="mailto:nawasena@its.ac.id"
                  className="hover:text-primary"
                >
                  nawasena@its.ac.id
                </a>
              </li>
              <li className="flex items-start gap-2 text-gray-600 text-sm">
                <Phone size={16} className="mt-0.5 flex-shrink-0" />
                <span>(031) 5994251</span>
              </li>
              <li className="flex items-start gap-2 text-rose-600 text-sm pt-1 border-t border-gray-200 mt-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>
                  Darurat kesehatan mental:{' '}
                  <a
                    href="tel:119"
                    className="font-semibold hover:underline"
                  >
                    119 ext 8
                  </a>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row md:justify-between gap-2">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} NAWASENA — Pengaderan ITS. Hak cipta
            dilindungi.
          </p>
          <p className="text-gray-500 text-sm">
            Untuk MABA, KP, KASUH, OC, SC, BLM, Pembina, Satgas, SAC.
          </p>
        </div>
      </div>
    </footer>
  );
}
