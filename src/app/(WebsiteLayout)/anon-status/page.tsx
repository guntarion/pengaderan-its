/**
 * src/app/(WebsiteLayout)/anon-status/page.tsx
 * NAWASENA M12 — Public status lookup input form.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';

export default function AnonStatusPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalized = code.trim().toUpperCase();

    if (!/^NW-[A-Z0-9]{8}$/.test(normalized)) {
      setError('Format kode tidak valid. Contoh: NW-A1B2C3D4');
      return;
    }

    router.push(`/anon-status/${normalized}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-blue-50 to-sky-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600">
            <Search className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Cek Status Laporan
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Masukkan kode penelusuran yang Anda terima saat mengirim laporan.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-sky-100 bg-white p-6 dark:border-sky-900 dark:bg-gray-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                Kode Laporan
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="NW-A1B2C3D4"
                maxLength={11}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm text-gray-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              />
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Format: NW- diikuti 8 karakter (huruf kapital dan angka)
              </p>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-600"
            >
              Cek Status
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
