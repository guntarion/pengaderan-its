// src/app/auth/unauthorized/page.tsx
import Logo from '@/components/layout/shared/logo/Logo';
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Unauthorized access page
 * Displayed when user tries to access a page without required permissions
 */
const UnauthorizedPage = () => {
  return (
    <div className='relative overflow-hidden h-screen bg-muted flex flex-col items-center justify-center'>
      <div className='text-center'>
        <Logo />
        <h1 className='mt-8 text-4xl font-bold text-foreground'>Access Denied</h1>
        <p className='mt-4 text-lg text-muted-foreground'>You don&apos;t have permission to access this page.</p>
        <div className='mt-8 flex justify-center gap-4'>
          <Button asChild variant='secondary'>
            <Link href='/'>Go Home</Link>
          </Button>
          <Button asChild>
            <Link href='/auth/login'>Login with Different Account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
