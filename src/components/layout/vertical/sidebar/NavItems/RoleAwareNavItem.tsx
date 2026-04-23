'use client';

import React from 'react';
import { ChildItem } from '@/components/layout/vertical/sidebar/Sidebaritems';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavItemsProps {
  item: ChildItem;
}

/**
 * NavItem component that checks user role before rendering
 * Only displays menu items that the user has access to
 */
const RoleAwareNavItem: React.FC<NavItemsProps> = ({ item }) => {
  const pathname = usePathname();
  const { hasRole } = useAuth();
  const isActive = item.url === pathname;

  // If the item has roles specified, check if user has access
  if (item.roles && !hasRole(item.roles)) {
    return null; // Don't render this item if user doesn't have required role
  }

  return (
    <Link
      href={item.url || '#'}
      target={item.isPro ? '_blank' : undefined}
      className={cn(
        'flex items-center w-full px-4 py-2 text-sm rounded-md transition-colors',
        'hover:bg-primary/10 hover:text-primary',
        isActive && 'bg-primary/10 text-primary',
        !isActive && 'text-foreground/70'
      )}
    >
      <div className='flex items-center gap-3 w-full'>
        {item.icon ? (
          <Icon icon={item.icon} className={cn('h-[18px] w-[18px]', item.color)} />
        ) : (
          <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-primary' : 'bg-foreground/50 group-hover:bg-primary')} />
        )}
        <span className='truncate flex-1'>{item.name}</span>
        {item.isPro && (
          <Badge variant='secondary' className='text-[10px] px-2.5 py-1'>
            Pro
          </Badge>
        )}
      </div>
    </Link>
  );
};

export default RoleAwareNavItem;
