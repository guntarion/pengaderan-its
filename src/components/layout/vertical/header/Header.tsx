'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Profile from '@/components/layout/vertical/header/Profile';
import MobileSidebar from '@/components/layout/vertical/sidebar/MobileSidebar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const Header = () => {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header className={`sticky top-0 z-[5] ${isSticky ? 'bg-background shadow-md fixed w-full' : 'bg-transparent'}`}>
      <nav className='px-4 sm:px-6 lg:px-8 py-4'>
        <div className='flex items-center justify-between w-full'>
          <div className='flex items-center gap-2'>
            <Sheet>
              <SheetTrigger asChild>
                <button className='h-10 w-10 flex text-foreground/65 xl:hidden hover:text-primary hover:bg-primary/10 rounded-full justify-center items-center'>
                  <Icon icon='solar:hamburger-menu-line-duotone' height={21} />
                </button>
              </SheetTrigger>
              <SheetContent side='left' className='w-[200px] sm:w-[224px]'>
                <MobileSidebar />
              </SheetContent>
            </Sheet>

            <div className='relative'>
              <button className='h-10 w-10 hover:text-primary hover:bg-primary/10 rounded-full flex justify-center items-center'>
                <Icon icon='solar:bell-linear' height={20} />
                <Badge variant='default' className='h-2 w-2 absolute right-2 top-1 p-0' />
              </button>
            </div>
          </div>

          <div className='flex items-center gap-4'>
            <Button asChild size='sm'>
              <Link href='https://guntar.vercel.app/' target='_blank'>
                Manajemen Inovasi
              </Link>
            </Button>
            <Profile />
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
