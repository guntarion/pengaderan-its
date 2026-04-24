'use client';

/**
 * src/components/triwulan/AuditSubstansiChecklist.tsx
 * NAWASENA M14 — Full checklist of 10 audit substansi items for BLM.
 */

import { AuditSubstansiCard } from './AuditSubstansiCard';
import { AuditProgressBar } from './AuditProgressBar';
import { MuatanWajibKey, MuatanCoverageStatus } from '@prisma/client';

interface AuditItem {
  key: MuatanWajibKey;
  label: string;
  description: string;
  result: {
    id: string | null;
    coverage: MuatanCoverageStatus;
    evidenceRef: string | null;
    notes: string | null;
    assessedAt: string | null;
    assessedBy: { displayName: string | null; fullName: string | null } | null;
  };
}

interface AuditSubstansiChecklistProps {
  reviewId: string;
  items: AuditItem[];
  readonly?: boolean;
  onItemSaved?: (key: MuatanWajibKey, coverage: MuatanCoverageStatus) => void;
}

export function AuditSubstansiChecklist({
  reviewId,
  items,
  readonly = false,
  onItemSaved,
}: AuditSubstansiChecklistProps) {
  const assessedCount = items.filter(
    (i) => i.result.coverage !== MuatanCoverageStatus.NOT_ASSESSED
  ).length;

  return (
    <div className="space-y-4">
      <AuditProgressBar assessed={assessedCount} total={items.length} />

      <div className="space-y-3">
        {items.map((item) => (
          <AuditSubstansiCard
            key={item.key}
            reviewId={reviewId}
            itemKey={item.key}
            label={item.label}
            description={item.description}
            currentCoverage={item.result.coverage}
            currentNotes={item.result.notes}
            currentEvidenceRef={item.result.evidenceRef}
            assessedByName={
              item.result.assessedBy?.displayName ??
              item.result.assessedBy?.fullName ??
              null
            }
            readonly={readonly}
            onSaved={(key, coverage) => onItemSaved?.(key, coverage)}
          />
        ))}
      </div>
    </div>
  );
}
