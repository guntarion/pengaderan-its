/**
 * src/components/dashboard/widgets/EmptyState.tsx
 * Consistent empty state widget for dashboard sections.
 */

import React from 'react';
import { InboxIcon } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'error';
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  const isError = variant === 'error';

  return (
    <div
      className={`flex flex-col items-center justify-center py-8 px-4 text-center ${className}`}
    >
      <div
        className={`mb-3 rounded-full p-3 ${
          isError
            ? 'bg-red-50 dark:bg-red-900/20 text-red-400'
            : 'bg-sky-50 dark:bg-sky-900/20 text-sky-400'
        }`}
      >
        {icon ?? <InboxIcon className="h-6 w-6" />}
      </div>
      <p
        className={`text-sm font-medium ${
          isError ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        {title ?? (isError ? 'Widget tidak dapat dimuat' : 'Belum ada data')}
      </p>
      {description && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{description}</p>
      )}
    </div>
  );
}
