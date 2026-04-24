'use client';
import React from 'react';
import Sidebar from '@/components/layout/vertical/sidebar/Sidebar';
import Header from '@/components/layout/vertical/header/Header';
import { InstallPWABanner } from '@/components/pulse/InstallPWABanner';

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='flex min-h-screen'>
      <InstallPWABanner />
      <Sidebar />
      <div className='body-wrapper w-full bg-lightgray dark:bg-dark xl:ml-56'>
        <Header />
        <div className={`container mx-auto py-30`}>{children}</div>
      </div>
    </div>
  );
}
