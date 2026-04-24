/**
 * src/lib/passport/skem-config.ts
 * NAWASENA M05 — SKEM CSV column mapping config.
 *
 * Edit this file when SIM SKEM ITS updates their format.
 * No redeploy needed once config-driven approach is used.
 *
 * Delimiter: comma
 * Encoding: UTF-8 with BOM (Excel friendly)
 */

export interface SkemColumnMapping {
  header: string;
  field: string; // dot-notation path in row data
}

/**
 * SKEM export column definitions.
 * Order matters — matches SIM SKEM ITS column order.
 */
export const SKEM_COLUMNS: SkemColumnMapping[] = [
  { header: 'NRP', field: 'nrp' },
  { header: 'Nama Mahasiswa', field: 'userName' },
  { header: 'Nama Kegiatan', field: 'itemDescription' },
  { header: 'Kategori SKEM', field: 'skemCategory' },
  { header: 'Poin SKEM', field: 'skemPoints' },
  { header: 'Tanggal Diverifikasi', field: 'verifiedAt' },
  { header: 'Nama Verifier', field: 'verifierName' },
  { header: 'Dimensi', field: 'dimensi' },
];

/** CSV delimiter */
export const SKEM_DELIMITER = ',';

/** UTF-8 BOM for Excel compatibility */
export const UTF8_BOM = '﻿';

/** Date format for CSV: DD/MM/YYYY */
export function formatDateForSkem(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** Escape CSV cell value */
export function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  // Quote if contains comma, newline, or double-quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
