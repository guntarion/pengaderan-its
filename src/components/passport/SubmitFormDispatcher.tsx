'use client';

/**
 * src/components/passport/SubmitFormDispatcher.tsx
 * NAWASENA M05 — Routes to the correct evidence-type submission component.
 *
 * Lazy-loads each component to avoid bundling QR scanner code for non-QR flows.
 */

import dynamic from 'next/dynamic';

interface PassportItemInfo {
  id: string;
  namaItem: string;
  dimensi: string;
  evidenceType: string;
  keterangan: string | null;
}

interface SubmitFormDispatcherProps {
  item: PassportItemInfo;
  previousEntryId?: string | null;
}

// Dynamically import to keep bundle sizes small
const PhotoEvidenceSubmit = dynamic(
  () => import('./PhotoEvidenceSubmit').then((m) => ({ default: m.PhotoEvidenceSubmit })),
  { ssr: false, loading: () => <SubmitFormSkeleton /> },
);
const SignatureEvidenceSubmit = dynamic(
  () => import('./SignatureEvidenceSubmit').then((m) => ({ default: m.SignatureEvidenceSubmit })),
  { ssr: false, loading: () => <SubmitFormSkeleton /> },
);
const FileEvidenceSubmit = dynamic(
  () => import('./FileEvidenceSubmit').then((m) => ({ default: m.FileEvidenceSubmit })),
  { ssr: false, loading: () => <SubmitFormSkeleton /> },
);
const QrEvidenceSubmit = dynamic(
  () => import('./QrEvidenceSubmit').then((m) => ({ default: m.QrEvidenceSubmit })),
  { ssr: false, loading: () => <SubmitFormSkeleton /> },
);
const LogbookEvidenceSubmit = dynamic(
  () => import('./LogbookEvidenceSubmit').then((m) => ({ default: m.LogbookEvidenceSubmit })),
  { ssr: false, loading: () => <SubmitFormSkeleton /> },
);

function SubmitFormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-1/3" />
    </div>
  );
}

function ComingSoonStub({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Fitur ini belum tersedia. Hubungi panitia untuk informasi lebih lanjut.
      </p>
    </div>
  );
}

export function SubmitFormDispatcher({ item, previousEntryId }: SubmitFormDispatcherProps) {
  const { id: itemId, namaItem, evidenceType } = item;

  switch (evidenceType) {
    case 'FOTO':
      return (
        <PhotoEvidenceSubmit itemId={itemId} itemName={namaItem} previousEntryId={previousEntryId} />
      );
    case 'TANDA_TANGAN':
      return (
        <SignatureEvidenceSubmit
          itemId={itemId}
          itemName={namaItem}
          previousEntryId={previousEntryId}
        />
      );
    case 'FILE':
      return (
        <FileEvidenceSubmit itemId={itemId} itemName={namaItem} previousEntryId={previousEntryId} />
      );
    case 'QR_STAMP':
      return (
        <QrEvidenceSubmit itemId={itemId} itemName={namaItem} previousEntryId={previousEntryId} />
      );
    case 'LOGBOOK':
      return (
        <LogbookEvidenceSubmit
          itemId={itemId}
          itemName={namaItem}
          previousEntryId={previousEntryId}
        />
      );
    case 'ATTENDANCE':
      return <ComingSoonStub label="Bukti Absensi (Coming soon)" />;
    default:
      return (
        <ComingSoonStub label={`Tipe bukti '${evidenceType}' belum didukung`} />
      );
  }
}
