/**
 * src/components/dashboard/widgets/PartialDataBadge.tsx
 * Badge indicating data is incomplete/partial.
 */

'use client';

import React, { useState } from 'react';
import { AlertCircleIcon } from 'lucide-react';

interface PartialDataBadgeProps {
  reason: string;
  className?: string;
}

export function PartialDataBadge({ reason, className = '' }: PartialDataBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={`Data partial: ${reason}`}
      >
        <AlertCircleIcon className="h-3 w-3" />
        <span>Data Partial</span>
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 z-50 max-w-xs rounded-xl bg-gray-900 dark:bg-gray-700 px-3 py-2 text-xs text-white shadow-lg">
          {reason}
          <div className="absolute top-full left-3 -translate-y-px border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>
      )}
    </div>
  );
}
