import * as React from 'react';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

interface BreadcrumbProps {
  pageTitle: string;
  parent?: string;
}

const CommonBreadcrumb = ({ pageTitle, parent }: BreadcrumbProps) => {
  // Map parent text to correct URLs based on navigation structure
  const getParentUrl = (parent: string) => {
    switch (parent.toLowerCase()) {
      case 'administration':
        return '/users';
      case 'extra':
        return '/sample-page';
      case 'ai support':
        return '/testing-page/qwen-ai';
      case 'home':
        return '/';
      default:
        return '/';
    }
  };

  return (
    <div className='mb-6'>
      <h2 className='text-2xl font-semibold text-gray-800 dark:text-gray-200'>{pageTitle}</h2>
      {parent && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={getParentUrl(parent)}>{parent}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
    </div>
  );
};

export default CommonBreadcrumb;
