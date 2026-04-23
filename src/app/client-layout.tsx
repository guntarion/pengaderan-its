'use client';

import React from 'react';
import { SessionProvider } from '@/providers/SessionProvider';
import { ThemeProvider } from '@/components/theme/theme-provider';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}
