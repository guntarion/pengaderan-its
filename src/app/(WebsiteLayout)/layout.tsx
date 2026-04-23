// src/app/(WebsiteLayout)/layout.tsx
'use client';

import { Footer } from '@/components/website/Footer';
import { Navbar } from '@/components/website/Navbar';
import { Suspense } from 'react';

/**
 * Layout component for the website section
 * Provides the general structure for all website pages
 */
export default function WebsiteLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={<div className="h-16 bg-background"></div>}>
        <Navbar />
      </Suspense>
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}
