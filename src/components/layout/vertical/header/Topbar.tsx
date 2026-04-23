'use client';

import { Icon } from '@iconify/react/dist/iconify.js';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExternalLink, Laptop, ShoppingCart } from 'lucide-react';

const Topbar = () => {
  const dropdownItems = [
    {
      id: 1,
      title: 'Bootstrap Preview',
      href: 'https://www.wrappixel.com/templates/materialm-admin-dashboard-template/?ref=376',
    },
    {
      id: 2,
      title: 'Angular Preview',
      href: 'https://www.wrappixel.com/templates/materialm-material-angular-dashboard-template/?ref=376',
    },
    {
      id: 3,
      title: 'Vuejs Preview',
      href: 'https://www.wrappixel.com/templates/materialm-vuejs-vuetify-admin-template/?ref=376',
    },
    {
      id: 4,
      title: 'Reactjs Preview',
      href: 'https://www.wrappixel.com/templates/materialm-tailwind-react-admin-template/?ref=376',
    },
    {
      id: 5,
      title: 'Nextjs Preview',
      href: 'https://www.wrappixel.com/templates/materialm-next-js-tailwind-dashboard-template/?ref=376',
    },
  ];

  return (
    <div className='py-3 px-4 bg-background sticky top-0 z-40 border-b'>
      <div className='flex items-center xl:justify-between lg:justify-center xl:gap-0 lg:gap-4 flex-wrap justify-center'>
        <div className='flex items-center gap-12'>
          <div className='lg:flex items-center gap-3 hidden'>
            <Button variant='ghost' size='sm' asChild className='flex gap-2'>
              <Link href='https://support.wrappixel.com/'>
                <Icon icon='tabler:lifebuoy' className='h-5 w-5' />
                Support
              </Link>
            </Button>
            <Button variant='ghost' size='sm' asChild className='flex gap-2'>
              <Link href='https://www.wrappixel.com'>
                <Icon icon='tabler:gift' className='h-5 w-5' />
                Templates
              </Link>
            </Button>
            <Button variant='ghost' size='sm' asChild className='flex gap-2'>
              <Link href='https://www.wrappixel.com/hire-us/'>
                <Icon icon='tabler:briefcase' className='h-5 w-5' />
                Hire Us
              </Link>
            </Button>
          </div>
        </div>

        <div className='flex items-center gap-4 flex-wrap justify-center lg:mt-0 mt-2'>
          <h4 className='text-lg font-medium'>Check MaterialM Premium Version</h4>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className='flex gap-2'>
                <Laptop className='h-4 w-4' />
                Live Preview
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {dropdownItems.map((item) => (
                <DropdownMenuItem key={item.id} asChild className='flex items-center gap-2'>
                  <Link href={item.href}>
                    <ExternalLink className='h-4 w-4' />
                    <span>{item.title}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size='sm' className='flex gap-2'>
                <ShoppingCart className='h-4 w-4' />
                Buy Now
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {dropdownItems.map((item) => (
                <DropdownMenuItem key={item.id} asChild className='flex items-center gap-2'>
                  <Link href={item.href}>
                    <ExternalLink className='h-4 w-4' />
                    <span>{item.title}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
