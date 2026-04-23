// Reusable skeleton components for loading states.
// Built on shadcn/ui Skeleton primitive.
//
// Usage:
//   <SkeletonCard />           — single card placeholder
//   <SkeletonTable rows={5} /> — table placeholder
//   <SkeletonForm fields={4} /> — form placeholder
//   <SkeletonText lines={3} /> — paragraph placeholder

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/** Card skeleton with image area, title, and description lines. */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border p-4 space-y-3', className)}>
      <Skeleton className="h-32 w-full rounded-md" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

/** Multiple card skeletons in a grid. */
export function SkeletonCardGrid({ count = 6, className }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Table skeleton with header and rows. */
export function SkeletonTable({
  columns = 4,
  rows = 5,
  className,
}: SkeletonProps & { columns?: number; rows?: number }) {
  return (
    <div className={cn('rounded-md border', className)}>
      {/* Header */}
      <div className="flex gap-4 border-b p-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 border-b p-3 last:border-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Form skeleton with label + input pairs. */
export function SkeletonForm({
  fields = 4,
  className,
}: SkeletonProps & { fields?: number }) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

/** Text paragraph skeleton. */
export function SkeletonText({
  lines = 3,
  className,
}: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? 'w-4/5' : 'w-full')}
        />
      ))}
    </div>
  );
}

/** Page header skeleton (title + description). */
export function SkeletonPageHeader({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}
