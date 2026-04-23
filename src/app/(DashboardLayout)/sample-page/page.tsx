'use client';

import React from 'react';
import CommonBreadcrumb from '@/components/shared/CommonBreadcrumb';
import CommonCardHeader from '@/components/shared/CommonCardHeader';

const SamplePage = () => {
  return (
    <>
      <CommonBreadcrumb pageTitle='Sample Page' parent='Extra' />
      <div className='container mx-auto px-4'>
        <div className='grid grid-cols-1 gap-6'>
          <div className='col-span-1'>
            <div className='rounded-lg bg-white dark:bg-gray-800 shadow-md'>
              <CommonCardHeader heading='Sample Page' subHeading={[{ text: 'This is a sample page with common components' }]} />
              <div className='p-6'>
                <p className='text-gray-600 dark:text-gray-300'>This is a basic sample page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SamplePage;
