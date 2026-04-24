/**
 * src/components/reference/FormInventoryTable.tsx
 * Table display for form inventory.
 */

import React from 'react';

interface FormInventoryItem {
  id: string;
  namaForm: string;
  pengisiRole: string;
  frekuensi: string;
  estimasiMenit: number;
  prioritas: string;
  devicePrimary: string;
  dataTable: string;
  visibility: string;
}

interface FormInventoryTableProps {
  items: FormInventoryItem[];
}

const PRIORITAS_STYLES: Record<string, string> = {
  WAJIB: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  WAJIB_OPT_OUT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ENCOURAGED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  OPTIONAL: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  ON_DEMAND: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

export function FormInventoryTable({ items }: FormInventoryTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400 py-12">
        Belum ada form tersedia.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-slate-700">
            <th className="text-left py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-4">ID</th>
            <th className="text-left py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-4">Nama Form</th>
            <th className="text-left py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-4">Pengisi</th>
            <th className="text-left py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-4">Frekuensi</th>
            <th className="text-left py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 pr-4">Menit</th>
            <th className="text-left py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Prioritas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-sky-50/50 dark:hover:bg-sky-900/10 transition-colors">
              <td className="py-3 pr-4 font-mono text-xs text-gray-500 dark:text-gray-500">{item.id}</td>
              <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{item.namaForm}</td>
              <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{item.pengisiRole}</td>
              <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 capitalize">
                {item.frekuensi.replace('_', ' ').toLowerCase()}
              </td>
              <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{item.estimasiMenit}</td>
              <td className="py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITAS_STYLES[item.prioritas] ?? ''}`}>
                  {item.prioritas.replace('_', ' ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
