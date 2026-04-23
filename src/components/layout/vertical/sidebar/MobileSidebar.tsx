'use client';

import React from 'react';
import SidebarContent from '@/components/layout/vertical/sidebar/Sidebaritems';
import NavItems from '@/components/layout/vertical/sidebar/NavItems';
import NavCollapse from '@/components/layout/vertical/sidebar/NavCollapse';
import FullLogo from '@/components/layout/shared/logo/FullLogo';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';

// Simple horizontal divider component
const Divider = () => <div className='h-px w-full bg-border my-2'></div>;

const MobileSidebar = () => {
  const { hasRole } = useAuth();

  // Filter sidebar content based on user roles
  const filteredContent = SidebarContent.filter((item) => {
    if (!item.roles) return true;
    return hasRole(item.roles);
  });

  return (
    <div className='h-full'>
      <div className='flex flex-col h-full'>
        <div className='px-3 py-4'>
          <FullLogo />
        </div>

        <ScrollArea className='flex-1 px-2'>
          <nav className='space-y-5'>
            {filteredContent.map((item, index) => (
              <div key={index} className='space-y-3'>
                {item.heading && <h5 className='text-sm font-semibold text-muted-foreground px-2'>{item.heading}</h5>}

                <Divider />

                <div className='space-y-1'>
                  {item.children?.map((child, childIndex) => {
                    // Skip items that require roles the user doesn't have
                    if (child.roles && !hasRole(child.roles)) return null;

                    return (
                      <React.Fragment key={`${child.id}-${childIndex}`}>
                        {child.children ? <NavCollapse item={child} /> : <NavItems item={child} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </div>
  );
};

export default MobileSidebar;
