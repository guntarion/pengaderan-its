'use client';

// Dynamic breadcrumb that auto-generates from URL segments.
// Supports label overrides for dynamic segments (e.g. IDs → names).
//
// Usage:
//   <DynamicBreadcrumb />                           — auto from URL
//   <DynamicBreadcrumb labels={{ 'abc123': 'John' }} />  — override dynamic segment
//   <DynamicBreadcrumb homeLabel="Dashboard" homeHref="/dashboard" />

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';

interface DynamicBreadcrumbProps {
  /** Override labels for specific segments. Key = segment string, Value = display label. */
  labels?: Record<string, string>;
  /** Label for the home/root breadcrumb. Default: "Home" */
  homeLabel?: string;
  /** Href for the home breadcrumb. Default: "/" */
  homeHref?: string;
  /** Hide the home breadcrumb. */
  hideHome?: boolean;
  /** Show home as icon instead of text. Default: true */
  homeIcon?: boolean;
  /** Segments to skip (e.g. route group names like "(DashboardLayout)"). Auto-skips parenthesized segments. */
  skipSegments?: string[];
  className?: string;
}

export function DynamicBreadcrumb({
  labels = {},
  homeLabel = 'Home',
  homeHref = '/',
  hideHome = false,
  homeIcon = true,
  skipSegments = [],
  className,
}: DynamicBreadcrumbProps) {
  const pathname = usePathname();

  const segments = React.useMemo(() => {
    const raw = pathname.split('/').filter(Boolean);

    // Filter out route group segments (parenthesized) and user-specified skips
    const skipSet = new Set(skipSegments.map((s) => s.toLowerCase()));
    return raw.filter((seg) => {
      if (seg.startsWith('(') && seg.endsWith(')')) return false;
      if (skipSet.has(seg.toLowerCase())) return false;
      return true;
    });
  }, [pathname, skipSegments]);

  // Build breadcrumb items with cumulative paths
  const items = React.useMemo(() => {
    return segments.map((segment, index) => {
      // Rebuild path from filtered segments
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label = labels[segment] ?? formatSegment(segment);
      const isLast = index === segments.length - 1;
      return { href, label, isLast };
    });
  }, [segments, labels]);

  if (items.length === 0 && hideHome) return null;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {/* Home */}
        {!hideHome && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={homeHref}>
                  {homeIcon ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    homeLabel
                  )}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {items.length > 0 && <BreadcrumbSeparator />}
          </>
        )}

        {/* Segments */}
        {items.map((item, index) => (
          <React.Fragment key={item.href}>
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!item.isLast && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Convert URL segment to readable label: "my-page" → "My Page" */
function formatSegment(segment: string): string {
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
