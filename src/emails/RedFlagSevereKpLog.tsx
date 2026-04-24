/**
 * src/emails/RedFlagSevereKpLog.tsx
 * NAWASENA M09 — Severe red flag alert to SC.
 * Triggered when KP submits a daily log with INJURY or SHUTDOWN flag.
 * These are HIGH-SEVERITY flags that may cascade to M10 Safeguarding.
 */

import React from 'react';
import { BaseLayout } from './BaseLayout';

interface RedFlagSevereKpLogProps {
  scName?: string;
  kpName?: string;
  mabaNames?: string[];
  flagTypes?: string[];
  logDate?: string;
  kpNotes?: string;
  detailUrl?: string;
}

export function RedFlagSevereKpLog({
  scName = 'SC',
  kpName = 'KP',
  mabaNames = [],
  flagTypes = [],
  logDate,
  kpNotes = 'Tidak ada catatan tambahan.',
  detailUrl,
}: RedFlagSevereKpLogProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const actionUrl = detailUrl ?? `${baseUrl}/dashboard/sc/m09/red-flag-feed`;
  const dateLabel = logDate ?? 'Hari ini';
  const mabaLabel = mabaNames.length > 0 ? mabaNames.join(', ') : 'anggota kelompok';
  const flagLabel = flagTypes.length > 0 ? flagTypes.join(', ') : 'INJURY / SHUTDOWN';

  return (
    <BaseLayout preview={`[KRITIS] Red flag SEVERE dari KP ${kpName} — tindakan segera diperlukan!`}>
      {/* Critical Banner */}
      <div
        style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #fecaca',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
          RED FLAG SEVERE
        </p>
        <p style={{ color: '#b91c1c', fontSize: '12px', margin: '4px 0 0' }}>
          Tindakan segera diperlukan — mungkin melibatkan M10 Safeguarding
        </p>
      </div>

      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
        Laporan Red Flag Kritis: {kpName}
      </h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Hei <strong>{scName}</strong>,
      </p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        <strong>{kpName}</strong> telah menandai <strong>red flag SEVERE</strong> dalam Log Harian KP
        tertanggal <strong>{dateLabel}</strong>.
      </p>

      {/* Flag details */}
      <div
        style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          margin: '16px 0',
        }}
      >
        <p style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 'bold', margin: '0 0 8px' }}>
          Detail Insiden:
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ color: '#6b7280', fontSize: '12px', paddingBottom: '4px', width: '120px' }}>
                Jenis Flag:
              </td>
              <td style={{ color: '#991b1b', fontSize: '12px', fontWeight: 'bold', paddingBottom: '4px' }}>
                {flagLabel}
              </td>
            </tr>
            <tr>
              <td style={{ color: '#6b7280', fontSize: '12px', paddingBottom: '4px' }}>
                Maba Terkait:
              </td>
              <td style={{ color: '#991b1b', fontSize: '12px', paddingBottom: '4px' }}>
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
        Situasi ini mungkin telah <strong>diteruskan ke antrian M10 Safeguarding</strong> secara otomatis.
        Harap verifikasi dan lakukan tindakan sesuai SOP Safeguarding NAWASENA.
      </p>

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a
          href={actionUrl}
          style={{
            backgroundColor: '#ef4444',
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

      <div
        style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '16px',
        }}
      >
        <p style={{ color: '#b91c1c', fontSize: '12px', margin: 0 }}>
          Email ini dikirim sebagai <strong>notifikasi darurat</strong> yang tidak dapat di-nonaktifkan.
          Ini demi keamanan seluruh anggota NAWASENA.
        </p>
      </div>
    </BaseLayout>
  );
}

export default RedFlagSevereKpLog;
