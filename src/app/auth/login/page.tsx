// src/app/auth/login/page.tsx
import Logo from '@/components/layout/shared/logo/Logo';
import React, { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import AuthLogin from '../authforms/AuthLogin';

export const metadata: Metadata = {
  title: 'Login - Guntar-NextJS',
  description: 'Access the modern web application platform',
};

// Loading component for Suspense fallback
const AuthLoginLoading = () => (
  <div className='p-4 rounded-md bg-gray-100 animate-pulse'>
    <div className='h-8 bg-gray-200 rounded mb-4'></div>
    <div className='h-8 bg-gray-200 rounded mb-4'></div>
    <div className='h-8 bg-gray-200 rounded'></div>
  </div>
);

const BoxedLogin = () => {
  return (
    <div className='min-h-screen bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900'>
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-50">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-100 dark:bg-blue-800"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-indigo-100 dark:bg-indigo-800"></div>
      </div>
      
      <div className='container mx-auto px-4 py-10 relative z-10'>
        <div className='flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]'>
          <div className='w-full max-w-md'>
            <div className='flex justify-center mb-6'>
              <div className='p-2 bg-white rounded-full shadow-md'>
                <Logo />
              </div>
            </div>
            
            <div className='bg-white dark:bg-gray-800 shadow-xl rounded-xl overflow-hidden'>
              <div className='px-8 py-10'>
                <header className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    Welcome to Guntar-NextJS
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Modern web application platform powered by Next.js
                  </p>
                </header>

                {/* Wrap AuthLogin in Suspense to handle useSearchParams */}
                <Suspense fallback={<AuthLoginLoading />}>
                  <AuthLogin />
                </Suspense>

                <div className='flex gap-2 text-base text-gray-600 dark:text-gray-300 mt-6 items-center justify-center'>
                  <p>Don&apos;t have an account?</p>
                  <Link href={'/auth/register'} className='text-blue-600 dark:text-blue-400 font-medium hover:underline'>
                    Register
                  </Link>
                </div>
              </div>
            </div>
            
            <footer className="mt-8 text-center text-gray-600 dark:text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} Guntar-NextJS. All rights reserved.
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoxedLogin;
