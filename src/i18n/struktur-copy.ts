/**
 * src/i18n/struktur-copy.ts
 * Copy lock file for re-pair consent flow.
 *
 * DO NOT CHANGE — reviewed by UX + BLM.
 *
 * Rules:
 * - No stigmatizing language (avoid "tidak cocok", "masalah", "gagal")
 * - Frame as structural assistance, not personal judgment
 * - Button text must be neutral and procedural
 */

export const STRUKTUR_COPY = {
  // ---- Re-pair request button (Kasuh card on Relasi Saya) ----
  repairButton: 'Ajukan Pergantian Kasuh',

  // ---- Form labels ----
  formTitle: 'Ajukan Pergantian Kakak Asuh',
  formDescription:
    'Pengajuan ini akan ditinjau oleh SC. Kamu dapat mengajukan maksimal 2 kali selama 3 minggu pertama.',
  noteLabel: 'Catatan untuk SC (opsional)',
  notePlaceholder: 'Tulis keterangan tambahan jika perlu (maks 1000 karakter)',
  submitLabel: 'Kirim Pengajuan',
  cancelLabel: 'Batal',

  // ---- Request types ----
  typeLabels: {
    RE_PAIR_KASUH: 'Pergantian Kakak Asuh',
    KASUH_UNREACHABLE: 'Kakak Asuh Tidak Dapat Dihubungi',
  } as Record<string, string>,

  // ---- Empty states ----
  emptyRequests: 'Anda belum pernah mengajukan pergantian',
  noActiveKasuh: 'Anda belum memiliki Kakak Asuh aktif.',

  // ---- Status labels ----
  statusLabels: {
    PENDING: 'Menunggu Tinjauan',
    APPROVED: 'Disetujui',
    REJECTED: 'Tidak Dapat Diproses',
    FULFILLED: 'Selesai',
    CANCELLED: 'Dibatalkan',
  } as Record<string, string>,

  // ---- Limit reached ----
  limitReachedTitle: 'Batas Pengajuan Tercapai',
  limitReachedDescription:
    'Anda telah mencapai batas 2 pengajuan untuk cohort ini. Hubungi SC secara langsung jika masih membutuhkan bantuan.',

  // ---- Outside window ----
  windowClosedTitle: 'Masa Pengajuan Telah Berakhir',
  windowClosedDescription:
    'Pengajuan hanya dapat dilakukan dalam 3 minggu pertama sejak cohort dimulai.',

  // ---- Timeline labels ----
  timelineSubmitted: 'Pengajuan dikirim',
  timelineApproved: 'Pengajuan disetujui oleh SC',
  timelineRejected: 'Pengajuan tidak dapat diproses',
  timelineFulfilled: 'Kakak Asuh baru ditetapkan',

  // ---- SC fulfill flow ----
  scApproveButton: 'Setujui',
  scRejectButton: 'Tidak Dapat Diproses',
  scFulfillButton: 'Approve & Tetapkan Kasuh Baru',
  scSuggestButton: 'Lihat Rekomendasi Kasuh',

  // ---- Kasuh unreachable (from Kasuh side) ----
  unreachableButton: 'Adik tidak dapat dihubungi',
  unreachableConfirm: 'Laporkan bahwa adik asuh tidak dapat dihubungi?',
  unreachableDescription: 'Laporan ini akan diteruskan ke SC untuk ditindaklanjuti.',
} as const;

export type StrukturCopyKey = keyof typeof STRUKTUR_COPY;
