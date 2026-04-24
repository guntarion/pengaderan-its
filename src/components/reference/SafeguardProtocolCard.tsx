/**
 * src/components/reference/SafeguardProtocolCard.tsx
 * Card displaying a single safeguard protocol.
 */

import React from 'react';

interface SafeguardProtocolCardProps {
  protocol: {
    id: string;
    mechanism: string;
    description: string;
    whenActivated: string;
    responsibleRole: string;
    protocolSteps: string;
    ordinal: number;
  };
}

export function SafeguardProtocolCard({ protocol }: SafeguardProtocolCardProps) {
  const steps = protocol.protocolSteps
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg">
          {protocol.id}
        </span>
        <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">
          {protocol.responsibleRole}
        </span>
      </div>

      <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">
        {protocol.mechanism}
      </h3>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{protocol.description}</p>

      <div className="mb-3">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Kapan diaktifkan: </span>
        <span className="text-xs text-gray-700 dark:text-gray-300">{protocol.whenActivated}</span>
      </div>

      {steps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Langkah Protokol:</p>
          <ol className="space-y-1">
            {steps.map((step, idx) => (
              <li key={idx} className="flex gap-2 text-xs">
                <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  {idx + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
