// src/app/auth/register/page.tsx
import Image from 'next/image';
import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import AuthRegister from '../authforms/AuthRegister';

export const metadata: Metadata = {
  title: 'Daftar Akun',
  description: 'Daftarkan akun NAWASENA untuk mengikuti pengaderan ITS.',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Link href="/landingpage" aria-label="NAWASENA" className="block">
            <Image
              src="/images/logos/Logo-its-biru-transparan.webp"
              alt="Logo ITS"
              width={64}
              height={64}
              priority
              className="h-16 w-16 object-contain"
            />
          </Link>
          <h1 className="mt-4 text-xl font-bold text-sky-900 dark:text-sky-100 tracking-wide">
            NAWASENA
          </h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Pengaderan ITS
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-sky-100 dark:ring-slate-800 p-7">
          <header className="text-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Daftar Akun
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Mulai perjalanan pengaderan Anda di ITS
            </p>
          </header>

          <AuthRegister />

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-sm text-muted-foreground">
            Sudah punya akun?{' '}
            <Link
              href="/auth/login"
              className="text-sky-700 dark:text-sky-400 font-medium hover:underline"
            >
              Masuk
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} NAWASENA — Institut Teknologi Sepuluh Nopember
        </p>
      </div>
    </div>
  );
}
