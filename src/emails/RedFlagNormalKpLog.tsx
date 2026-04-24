/**
 * src/emails/RedFlagNormalKpLog.tsx
 * NAWASENA M09 — Normal red flag alert to SC.
 * Triggered when KP submits a daily log with MENANGIS, KONFLIK, or WITHDRAW flag.
 * These are MEDIUM-SEVERITY flags that require SC awareness but do not cascade to M10.
 */

import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface RedFlagNormalKpLogProps {
  scName?: string;
  kpName?: string;
  mabaNames?: string[];
  flagTypes?: string[];
  logDate?: string;
  kpNotes?: string;
  detailUrl?: string;
  unsubscribeToken?: string;
}

export function RedFlagNormalKpLog({
  scName = 'SC',
  kpName = 'KP',
  mabaNames = [],
  flagTypes = [],
  logDate,
  kpNotes = 'Tidak ada catatan tambahan.',
  detailUrl,
  unsubscribeToken = '',
}: RedFlagNormalKpLogProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const actionUrl = detailUrl ?? `${baseUrl}/dashboard/sc/m09/red-flag-feed`;
  const dateLabel = logDate ?? 'Hari ini';
  const mabaLabel = mabaNames.length > 0 ? mabaNames.join(', ') : 'anggota kelompok';
  const flagLabel = flagTypes.length > 0 ? flagTypes.join(', ') : 'MENANGIS / KONFLIK / WITHDRAW';

  return (
    <BaseLayout preview={`[Perhatian] Red flag dari KP ${kpName} — ${dateLabel}`}>
      {/* Warning Banner */}
      <div
        style={{
          backgroundColor: '#fffbeb',
          border: '2px solid #fde68a',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#b45309', fontWeight: 'bold', fontSize: '15px', margin: 0 }}>
          RED FLAG — PERHATIAN
        </p>
        <p style={{ color: '#92400e', fontSize: '12px', margin: '4px 0 0' }}>
          Perlu tindak lanjut dari SC
        </p>
      </div>

      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
        Laporan Red Flag: {kpName}
      </h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Hei <strong>{scName}</strong>,
      </p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        <strong>{kpName}</strong> telah mencatat <strong>red flag</strong> dalam Log Harian KP
        tertanggal <strong>{dateLabel}</strong>. Harap tindak lanjuti sesuai SOP pendampingan.
      </p>

      {/* Flag details */}
      <div
        style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '12px 16px',
          margin: '16px 0',
        }}
      >
        <p style={{ color: '#92400e', fontSize: '13px', fontWeight: 'bold', margin: '0 0 8px' }}>
          Detail Laporan:
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ color: '#6b7280', fontSize: '12px', paddingBottom: '4px', width: '120px' }}>
                Jenis Flag:
              </td>
              <td style={{ color: '#b45309', fontSize: '12px', fontWeight: 'bold', paddingBottom: '4px' }}>
                {flagLabel}
              </td>
            </tr>
            <tr>
              <td style={{ color: '#6b7280', fontSize: '12px', paddingBottom: '4px' }}>
                Maba Terkait:
              </td>
              <td style={{ color: '#78350f', fontSize: '12px', paddingBottom: '4px' }}>
                {mabaLabel}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* KP notes */}
      <div
        style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px 16px',
          margin: '16px 0',
        }}
      >
        <p style={{ color: '#374151', fontSize: '13px', fontWeight: 'bold', margin: '0 0 4px' }}>
          Catatan dari KP:
        </p>
        <p style={{ color: '#4b5563', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
          {kpNotes}
        </p>
      </div>

      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Lihat detail lengkap log dan riwayat kondisi Maba pada tautan di bawah.
      </p>

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a
          href={actionUrl}
          style={{
            background: 'linear-gradient(to right, #f59e0b, #d97706)',
            color: 'white',
            padding: '12px 32px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'inline-block',
          }}
        >
          Lihat Red Flag Feed
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}

export default RedFlagNormalKpLog;
