'use client';

/**
 * src/components/notifications/RuleOverrideBadge.tsx
 * NAWASENA M15 — Badge showing rule category override status
 */

import { Badge } from '@/components/ui/badge';
import { ShieldAlert } from 'lucide-react';

interface RuleOverrideBadgeProps {
  overrideCategory?: string | null;
  className?: string;
}

export function RuleOverrideBadge({ overrideCategory, className }: RuleOverrideBadgeProps) {
  if (!overrideCategory) return null;

  if (overrideCategory === 'CRITICAL') {
    return (
      <Badge
        className={`bg-red-100 text-red-800 border border-red-300 text-xs flex items-center gap-1 ${className ?? ''}`}
      >
        <ShieldAlert className="h-3 w-3" />
        CRITICAL override
      </Badge>
    );
  }

  return (
    <Badge
      className={`bg-amber-100 text-amber-800 border border-amber-300 text-xs ${className ?? ''}`}
    >
      {overrideCategory} override
    </Badge>
  );
}
