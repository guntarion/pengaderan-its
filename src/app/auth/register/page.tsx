// src/app/auth/register/page.tsx
import Logo from '@/components/layout/shared/logo/Logo';
import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import AuthRegister from '../authforms/AuthRegister';

export const metadata: Metadata = {
  title: 'Register - Guntar-NextJS',
  description: 'Join the modern web application platform',
};

const BoxedRegister = () => {
  return (
    <div className='min-h-screen bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900'>
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-50">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-100 dark:bg-blue-800"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-indigo-100 dark:bg-indigo-800"></div>
        <div className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-blue-200/50 dark:bg-blue-700/50"></div>
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
                    Create Guntar-NextJS Account
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Start your journey with modern web applications
                  </p>
                </header>

                <AuthRegister />

                <div className='flex gap-2 text-base text-gray-600 dark:text-gray-300 mt-6 items-center justify-center'>
                  <p>Already have an account?</p>
                  <Link href={'/auth/login'} className='text-blue-600 dark:text-blue-400 font-medium hover:underline'>
                    Login
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

export default BoxedRegister;
