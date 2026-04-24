import React from 'react';
import { BaseLayout } from './BaseLayout';

interface AnonReportSilentProps {
  userName?: string;
  reportId?: string;
  reportUrl?: string;
}

export function AnonReportSilent({ userName = 'Petugas', reportId, reportUrl }: AnonReportSilentProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const detailUrl = reportUrl ?? `${baseUrl}/admin/reports`;
  return (
    <BaseLayout preview={`Ada laporan anonim baru yang membutuhkan penanganan segera.`}>
      <div style={{ backgroundColor: '#fef2f2', border: '2px solid #fecaca', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>LAPORAN ANONIM BARU</p>
        <p style={{ color: '#b91c1c', fontSize: '12px', margin: '4px 0 0' }}>Penanganan segera diperlukan</p>
      </div>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>Laporan Anonim Diterima</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Ada <strong>laporan anonim baru</strong> yang masuk ke sistem NAWASENA{reportId ? ` (ID: ${reportId})` : ''}.
        Mohon ditindaklanjuti sesuai prosedur Safeguard.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={detailUrl} style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Lihat Laporan
        </a>
      </div>
    </BaseLayout>
  );
}
export default AnonReportSilent;
