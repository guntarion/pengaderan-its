import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface PassportVerifiedProps {
  userName?: string;
  dimensiName?: string;
  passportUrl?: string;
  unsubscribeToken?: string;
}

export function PassportVerified({ userName = 'Maba', dimensiName = 'Dimensi', passportUrl, unsubscribeToken = '' }: PassportVerifiedProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = passportUrl ?? `${baseUrl}/dashboard/passport`;
  return (
    <BaseLayout preview={`Entri Passport dimensi ${dimensiName} kamu telah diverifikasi!`}>
      <div style={{ backgroundColor: '#ecfdf5', border: '2px solid #a7f3d0', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
        <p style={{ color: '#10b981', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>PASSPORT TERVERIFIKASI!</p>
      </div>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>Entri Passport Kamu Diverifikasi</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Selamat! Entri Passport dimensi <strong>{dimensiName}</strong> kamu telah <strong>diverifikasi</strong>. Progress Passport kamu bertambah!
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={fillUrl} style={{ background: 'linear-gradient(to right, #10b981, #0ea5e9)', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Lihat Passport Kamu
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}
export default PassportVerified;
