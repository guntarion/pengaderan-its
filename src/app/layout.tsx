import React from 'react';
import { Inter } from 'next/font/google';
import 'simplebar-react/dist/simplebar.min.css';
import './css/globals.css';
import ClientLayout from './client-layout';
import { metadata } from './metadata';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export { metadata };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='id'>
      <head>
        <link rel='icon' href='/favicon.svg' type='image/svg+xml' />
        <link rel='manifest' href='/manifest.json' />
        <meta name='theme-color' content='#0ea5e9' />
      </head>
      <body className={`${inter.className}`}>
        <ClientLayout>{children}</ClientLayout>
        <Toaster />
      </body>
    </html>
  );
}
