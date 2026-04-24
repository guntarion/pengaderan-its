/**
 * src/components/dashboard/layouts/DashboardGrid.tsx
 * Responsive dashboard grid layout.
 * 1-col mobile, 2-col tablet, 3-col desktop.
 */

import React from 'react';

interface DashboardGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}

export function DashboardGrid({ children, cols = 3, className = '' }: DashboardGridProps) {
  const colClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[cols];

  return (
    <div className={`grid ${colClass} gap-4 ${className}`}>
      {children}
    </div>
  );
}

interface DashboardSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardSection({ title, children, className = '' }: DashboardSectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      {title && (
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
      )}
      {children}
    </section>
  );
}

interface FullWidthProps {
  children: React.ReactNode;
  className?: string;
}

export function FullWidth({ children, className = '' }: FullWidthProps) {
  return <div className={`col-span-full ${className}`}>{children}</div>;
}
