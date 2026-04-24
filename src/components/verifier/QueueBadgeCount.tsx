'use client';

/**
 * src/components/verifier/QueueBadgeCount.tsx
 * NAWASENA M05 — Polling badge that shows pending queue count (updates every 30s).
 */

import { useState, useEffect } from 'react';

export function QueueBadgeCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/verifier/queue?countOnly=true');
        if (!res.ok) return;
        const { data } = await res.json();
        setCount(typeof data === 'number' ? data : (data?.count ?? 0));
      } catch {
        // Silent fail — badge is non-critical
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (count === null || count === 0) return null;

  return (
    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
      {count > 99 ? '99+' : count}
    </span>
  );
}
