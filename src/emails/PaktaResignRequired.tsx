import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface PaktaResignRequiredProps {
  userName?: string;
  paktaType?: string;
  paktaUrl?: string;
  unsubscribeToken?: string;
}

export function PaktaResignRequired({ userName = 'Pengguna', paktaType = 'Pakta', paktaUrl, unsubscribeToken = '' }: PaktaResignRequiredProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = paktaUrl ?? `${baseUrl}/dashboard/pakta`;
  return (
    <BaseLayout preview={`Versi baru ${paktaType} telah diterbitkan — tanda tangan ulang diperlukan.`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>Tanda Tangan Ulang Diperlukan</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Versi baru <strong>{paktaType}</strong> telah diterbitkan. Kamu perlu menandatangani ulang
        pakta ini untuk melanjutkan partisipasi di NAWASENA.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={fillUrl} style={{ background: 'linear-gradient(to right, #0ea5e9, #2563eb)', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Tanda Tangan Sekarang
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}
export default PaktaResignRequired;
