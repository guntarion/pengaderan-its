// Global loading page for the App Router.
// Shown during route transitions at the root level.
// Each route group can have its own loading.tsx for more specific skeletons.

import { SkeletonPageHeader, SkeletonCardGrid } from '@/components/shared/skeletons';

export default function GlobalLoading() {
  return (
    <div className="p-6 space-y-6">
      <SkeletonPageHeader />
      <SkeletonCardGrid count={6} />
    </div>
  );
}
