// src/app/components/shared/LoadingScreen.tsx
'use client';

/**
 * Loading screen component with spinner and message
 * Used as a fallback while content is loading
 */
export default function LoadingScreen() {
  return (
    <div className='fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50'>
      <div className='flex flex-col gap-4 justify-center items-center h-full'>
        {/* Spinner */}
        <div className='animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full' />

        {/* Loading message */}
        <div className='flex flex-col items-center gap-2'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Loading...</h2>
          <p className='text-sm text-gray-600 dark:text-gray-400'>Please wait while we set up your experience</p>
        </div>
      </div>
    </div>
  );
}
