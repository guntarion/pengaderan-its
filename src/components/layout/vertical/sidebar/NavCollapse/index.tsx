'use client';

import React, { useState, useEffect } from 'react';
import { ChildItem } from '@/components/layout/vertical/sidebar/Sidebaritems';
import NavItems from '@/components/layout/vertical/sidebar/NavItems';
import { Icon } from '@iconify/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface NavCollapseProps {
  item: ChildItem;
}

/**
 * Navigation collapse component that filters child items based on user role
 */
const NavCollapse: React.FC<NavCollapseProps> = ({ item }) => {
  const pathname = usePathname();
  const { hasRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Filter children by user role
  const filteredChildren =
    item.children?.filter((child: ChildItem) => {
      if (!child.roles) return true;
      return hasRole(child.roles);
    }) || [];

  const activeDD = filteredChildren.find((t: ChildItem) => t.url === pathname);

  // Set initial open state based on active route
  useEffect(() => {
    setIsOpen(!!activeDD);
  }, [activeDD]);

  // Skip rendering if user doesn't have the required role or no accessible children
  if ((item.roles && !hasRole(item.roles)) || filteredChildren.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className='space-y-1'>
      <CollapsibleTrigger
        className={cn(
          'flex items-center justify-between w-full py-2 px-1 rounded-md text-sm',
          'hover:bg-primary/10 hover:text-primary',
          activeDD && 'bg-primary/10 text-primary'
        )}
      >
        <div className='flex items-center gap-1.5'>
          {item.icon && <Icon icon={item.icon} height={16} />}
          <span className='truncate'>{item.name}</span>
        </div>
        <div className='flex items-center'>
          {item.isPro && <span className='py-1 px-1.5 text-[10px] bg-secondary text-white rounded-full mr-1'>Pro</span>}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'transform rotate-180')} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className='pl-3'>
        {filteredChildren.map((child: ChildItem) => (
          <React.Fragment key={child.id}>{child.children ? <NavCollapse item={child} /> : <NavItems item={child} />}</React.Fragment>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default NavCollapse;