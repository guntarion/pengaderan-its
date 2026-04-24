/**
 * src/lib/triwulan/audit-substansi/muatan-wajib.ts
 * NAWASENA M14 — Muatan Wajib Catalog.
 *
 * 10 mandatory content items for audit substansi per Kerangka §7.
 * Hardcoded in code (not DB) — enum-driven.
 */

import { MuatanWajibKey } from '@prisma/client';

export interface MuatanWajibItem {
  label: string;
  description: string;
}

export const MUATAN_WAJIB_CATALOG: Record<MuatanWajibKey, MuatanWajibItem> = {
  [MuatanWajibKey.NARASI_SEPULUH_NOPEMBER]: {
    label: 'Narasi Sepuluh Nopember',
    description:
      'Konten kaderisasi mencakup narasi sejarah dan semangat 10 November 1945 sebagai fondasi nilai perjuangan mahasiswa ITS.',
  },
  [MuatanWajibKey.ADVANCING_HUMANITY]: {
    label: 'Advancing Humanity (Tagline ITS)',
    description:
      "Tagline ITS 'Advancing Humanity' terintegrasi dalam materi dan praktik kegiatan kaderisasi sebagai orientasi kontribusi mahasiswa.",
  },
  [MuatanWajibKey.ENAM_TATA_NILAI_ITS]: {
    label: '6 Tata Nilai ITS',
    description:
      'Enam tata nilai ITS (Excellence, Innovation, Integrity, Inclusivity, Responsibility, Openness) disampaikan dan dipraktikkan dalam kaderisasi.',
  },
  [MuatanWajibKey.INTEGRALISTIK]: {
    label: 'Pendidikan Integralistik',
    description:
      'Pendekatan integralistik dalam kaderisasi: membangun mahasiswa yang utuh secara intelektual, emosional, sosial, dan spiritual.',
  },
  [MuatanWajibKey.STRUKTUR_KM_ITS]: {
    label: 'Struktur Keluarga Mahasiswa ITS',
    description:
      'Pemahaman struktur Keluarga Mahasiswa ITS: hierarki, hubungan antar organ, dan mekanisme koordinasi.',
  },
  [MuatanWajibKey.TRI_DHARMA]: {
    label: 'Tri Dharma Perguruan Tinggi',
    description:
      'Tiga dharma perguruan tinggi (Pendidikan, Penelitian, Pengabdian Masyarakat) sebagai landasan peran mahasiswa.',
  },
  [MuatanWajibKey.KODE_ETIK_MAHASISWA]: {
    label: 'Kode Etik Mahasiswa ITS',
    description:
      'Kode etik mahasiswa ITS disosialisasikan, dipahami, dan diterapkan dalam seluruh rangkaian kaderisasi.',
  },
  [MuatanWajibKey.PERMEN_55_2024_SATGAS]: {
    label: 'Permen 55/2024 & Satgas PPKPT',
    description:
      'Peraturan Menteri Dikbudristek No. 55/2024 tentang pencegahan kekerasan disosialisasikan. Satgas PPKPT aktif dan dikenal peserta.',
  },
  [MuatanWajibKey.RISET_ITS]: {
    label: 'Riset & Inovasi ITS',
    description:
      'Pengenalan budaya riset dan inovasi ITS, termasuk pusat riset unggulan dan kesempatan keterlibatan mahasiswa.',
  },
  [MuatanWajibKey.KEINSINYURAN_PII]: {
    label: 'Keinsinyuran & PII',
    description:
      'Pengenalan profesi insinyur, peran Persatuan Insinyur Indonesia (PII), dan jalur menuju sertifikasi keinsinyuran.',
  },
};

export function getAllItems(): Array<{ key: MuatanWajibKey } & MuatanWajibItem> {
  return Object.entries(MUATAN_WAJIB_CATALOG).map(([key, value]) => ({
    key: key as MuatanWajibKey,
    ...value,
  }));
}

export function getItem(key: MuatanWajibKey): MuatanWajibItem | undefined {
  return MUATAN_WAJIB_CATALOG[key];
}
