/**
 * src/emails/KasuhUrgentFlag.tsx
 * NAWASENA M09 — Urgent flag notification from Kasuh logbook to SC.
 * Triggered when Kasuh marks a logbook entry as URGENT (adik butuh perhatian segera).
 */

import React from 'react';
import { BaseLayout } from './BaseLayout';

interface KasuhUrgentFlagProps {
  scName?: string;
  kasuhName?: string;
  mabaName?: string;
  urgentNote?: string;
  cycleLabel?: string;
  detailUrl?: string;
}

export function KasuhUrgentFlag({
  scName = 'SC',
  kasuhName = 'Kasuh',
  mabaName = 'Adik Asuh',
  urgentNote = 'Tidak ada catatan tambahan.',
  cycleLabel = 'Siklus ini',
  detailUrl,
}: KasuhUrgentFlagProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const actionUrl = detailUrl ?? `${baseUrl}/dashboard/sc/m09/kasuh-overdue`;
  return (
    <BaseLayout preview={`[URGENT] ${kasuhName} menandai adik asuh ${mabaName} butuh perhatian segera!`}>
      {/* Urgent Banner */}
      <div
        style={{
          backgroundColor: '#fff7ed',
          border: '2px solid #fed7aa',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#c2410c', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
          FLAG URGENT DARI KASUH
        </p>
        <p style={{ color: '#9a3412', fontSize: '12px', margin: '4px 0 0' }}>
          Adik asuh membutuhkan perhatian segera
        </p>
      </div>

      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
        Laporan Urgent: {mabaName}
      </h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Hei <strong>{scName}</strong>,
      </p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        <strong>{kasuhName}</strong> telah menandai adik asuhnya, <strong>{mabaName}</strong>, sebagai membutuhkan
        perhatian segera dalam Logbook KASUH <strong>{cycleLabel}</strong>.
      </p>

      {/* Urgent note box */}
      <div
        style={{
          backgroundColor: '#fef9c3',
          border: '1px solid #fde047',
          borderRadius: '8px',
          padding: '12px 16px',
          margin: '16px 0',
        }}
      >
        <p style={{ color: '#713f12', fontSize: '13px', fontWeight: 'bold', margin: '0 0 4px' }}>
          Catatan dari Kasuh:
        </p>
        <p style={{ color: '#78350f', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
          {urgentNote}
        </p>
      </div>

      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Harap tindak lanjuti laporan ini sesegera mungkin. Kamu dapat melihat detail
        lengkap logbook dan riwayat pendampingan pada tautan di bawah.
      </p>

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a
          href={actionUrl}
          style={{
            backgroundColor: '#ea580c',
            color: 'white',
            padding: '12px 32px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'inline-block',
          }}
        >
          Lihat Detail Logbook
        </a>
      </div>

      <div
        style={{
          backgroundColor: '#fff7ed',
          border: '1px solid #fed7aa',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '16px',
        }}
      >
        <p style={{ color: '#9a3412', fontSize: '12px', margin: 0 }}>
          Email ini dikirim sebagai <strong>notifikasi prioritas tinggi</strong> dari sistem NAWASENA.
          Pastikan kamu segera menangani laporan ini sesuai SOP pendampingan.
        </p>
      </div>
    </BaseLayout>
  );
}

export default KasuhUrgentFlag;
