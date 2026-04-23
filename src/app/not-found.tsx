import Image from 'next/image';
import React from 'react';
import ErrorImg from '/public/images/backgrounds/errorimg.svg';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Error-404',
};

const Error = () => {
  return (
    <div className='h-screen flex items-center justify-center bg-background'>
      <div className='text-center'>
        <Image src={ErrorImg} alt='error' className='mb-4' />
        <h1 className='text-4xl font-bold mb-6 text-foreground'>Opps!!!</h1>
        <h6 className='text-xl text-muted-foreground'>This page you are looking for could not be found.</h6>
        <Button asChild className='mt-6'>
          <Link href='/'>Go Back to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default Error;
