'use client';

import React from 'react';
import { ChildItem } from '@/components/layout/vertical/sidebar/Sidebaritems';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface NavItemsProps {
  item: ChildItem;
}

/**
 * NavItems component for rendering sidebar menu items
 * Includes role-based access control
 */
const NavItems: React.FC<NavItemsProps> = ({ item }) => {
  const pathname = usePathname();
  const { hasRole } = useAuth();
  const isActive = pathname === item.url;

  // Skip rendering if user doesn't have the required role
  if (item.roles && !hasRole(item.roles)) {
    return null;
  }

  return (
    <Link
      href={item.url || '#'}
      target={item.isPro ? '_blank' : undefined}
      className={cn(
        'flex items-center justify-between w-full py-2 px-1 text-sm rounded-md transition-colors',
        'hover:bg-primary/10 hover:text-primary',
        isActive && 'bg-primary/10 text-primary',
        !isActive && 'text-foreground/70'
      )}
    >
      <div className='flex items-center gap-1.5'>
        {item.icon ? (
          <Icon icon={item.icon} className={cn('h-4 w-4', item.color)} />
        ) : (
          <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-primary' : 'bg-foreground/50 group-hover:bg-primary')} />
        )}
        <span className='truncate'>{item.name}</span>
      </div>

      {item.isPro && <span className='py-1 px-1.5 text-[10px] bg-secondary text-white rounded-full'>Pro</span>}
    </Link>
  );
};

export default NavItems;
