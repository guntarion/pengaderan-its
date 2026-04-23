'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

/**
 * User profile component for the dashboard header
 * Shows user information and authentication options
 */
const Profile = () => {
  const { user, logout, isAuthenticated } = useAuth();

  // Show login button if not authenticated
  if (!isAuthenticated) {
    return (
      <Button asChild variant='outline' size='sm' className='border-primary text-primary hover:bg-primary/10'>
        <Link href='/auth/login'>Login</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className='h-10 w-10 hover:text-primary hover:bg-primary/10 rounded-full flex justify-center items-center focus:outline-none'>
          <Image src={user?.image || '/images/profile/user-1.jpg'} alt={user?.name || 'User'} height={35} width={35} className='rounded-full' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <div className='px-4 py-3 text-sm'>
          <p className='font-medium text-foreground'>{user?.name}</p>
          <p className='text-muted-foreground truncate'>{user?.email}</p>
          <p className='text-xs text-muted-foreground mt-1 capitalize'>Role: {user?.role}</p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href='/profile' className='flex items-center gap-3 cursor-pointer'>
            <Icon icon='solar:user-circle-outline' height={20} />
            My Profile
          </Link>
        </DropdownMenuItem>

        {user?.role === 'admin' && (
          <DropdownMenuItem asChild>
            <Link href='/users' className='flex items-center gap-3 cursor-pointer'>
              <Icon icon='solar:users-group-rounded-outline' height={20} />
              Manage Users
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <div className='p-2'>
          <Button variant='outline' size='sm' onClick={() => logout()} className='w-full border-primary text-primary hover:bg-primary/10'>
            Logout
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Profile;
