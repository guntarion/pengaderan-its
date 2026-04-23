'use client';

import React, { memo } from 'react';
import SidebarContent, { MenuItem, ChildItem } from '@/components/layout/vertical/sidebar/Sidebaritems';
import NavItems from '@/components/layout/vertical/sidebar/NavItems';
import NavCollapse from '@/components/layout/vertical/sidebar/NavCollapse';
import FullLogo from '@/components/layout/shared/logo/FullLogo';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';

// Simple horizontal divider component
const Divider = () => <div className='h-px w-full bg-border my-2'></div>;

const MenuSection = memo(({ item, index, hasRole }: { item: MenuItem; index: number; hasRole: (roles: string[]) => boolean }) => {
  // Filter children based on user roles
  const filteredChildren =
    item.children?.filter((child) => {
      if (!child.roles) return true;
      return hasRole(child.roles);
    }) || [];

  // Don't render section if no accessible children
  if (filteredChildren.length === 0) return null;

  return (
    <div key={`section-${index}`} className='w-full'>
      {item.heading && (
        <h5 className='text-sm font-semibold text-muted-foreground mb-2'>{item.heading}</h5>
      )}
      <Divider />

      <div className='mt-3'>
        {filteredChildren.map((child: ChildItem, childIndex) => (
          <React.Fragment key={child.id || `item-${childIndex}`}>
            {child.children ? <NavCollapse item={child} /> : <NavItems item={child} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});

MenuSection.displayName = 'MenuSection';

const SidebarLayout: React.FC = () => {
  const { hasRole } = useAuth();

  // Filter sidebar content based on user roles
  const filteredContent = SidebarContent.filter((item) => {
    if (!item.roles) return true;
    return hasRole(item.roles);
  });

  return (
    <aside className='hidden xl:block fixed left-0 top-0 z-20 h-screen w-56 bg-background border-r'>
      <div className='flex flex-col h-full'>
        <div className='py-4'>
          <FullLogo />
        </div>
        <Divider />
        
        <ScrollArea className='flex-1 px-3'>
          <div className='space-y-4 py-2'>
            {filteredContent.map((item: MenuItem, index) => (
              <MenuSection key={index} item={item} index={index} hasRole={hasRole} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
};

export default memo(SidebarLayout);
