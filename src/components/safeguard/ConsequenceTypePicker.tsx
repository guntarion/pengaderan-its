'use client';

/**
 * src/components/safeguard/ConsequenceTypePicker.tsx
 * NAWASENA M10 — Radio button picker for pedagogical consequence types.
 *
 * Strictly shows only the 5 non-physical consequence types allowed
 * under Permendikbudristek No. 55/2024. No free-text / custom entry.
 */

import { ConsequenceType } from '@prisma/client';

export const CONSEQUENCE_TYPE_OPTIONS: {
  value: ConsequenceType;
  label: string;
  description: string;
}[] = [
  {
    value: ConsequenceType.REFLEKSI_500_KATA,
    label: 'Refleksi 500 Kata',
    description: 'Maba menulis refleksi diri minimal 500 kata tentang kejadian/perilaku.',
  },
  {
    value: ConsequenceType.PRESENTASI_ULANG,
    label: 'Presentasi Ulang',
    description: 'Maba mempresentasikan ulang materi atau insight yang relevan.',
  },
  {
    value: ConsequenceType.POIN_PASSPORT_DIKURANGI,
    label: 'Pengurangan Poin Passport',
    description: 'Poin Passport Digital dikurangi sejumlah tertentu (hanya SC/Safeguard Officer).',
  },
  {
    value: ConsequenceType.PERINGATAN_TERTULIS,
    label: 'Peringatan Tertulis',
    description: 'Surat peringatan tercatat secara resmi dalam sistem.',
  },
  {
    value: ConsequenceType.TUGAS_PENGABDIAN,
    label: 'Tugas Pengabdian Masyarakat',
    description: 'Maba diwajibkan melakukan kegiatan pengabdian masyarakat tertentu.',
  },
];

interface ConsequenceTypePickerProps {
  value: ConsequenceType | '';
  onChange: (value: ConsequenceType) => void;
  disabledTypes?: ConsequenceType[];
  error?: string;
}

export function ConsequenceTypePicker({
  value,
  onChange,
  disabledTypes = [],
  error,
}: ConsequenceTypePickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Tipe Konsekuensi <span className="text-red-500">*</span>
      </p>
      <div className="space-y-2">
        {CONSEQUENCE_TYPE_OPTIONS.map((option) => {
          const isDisabled = disabledTypes.includes(option.value);
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              className={[
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all',
                isDisabled
                  ? 'cursor-not-allowed opacity-50 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                  : isSelected
                    ? 'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-sky-300 hover:bg-sky-50/50',
              ].join(' ')}
            >
              <input
                type="radio"
                name="consequenceType"
                value={option.value}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => !isDisabled && onChange(option.value)}
                className="mt-0.5 h-4 w-4 text-sky-500 border-gray-300 focus:ring-sky-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {option.label}
                  {option.value === ConsequenceType.POIN_PASSPORT_DIKURANGI && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-normal">
                      (SC / Safeguard Officer)
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {option.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
