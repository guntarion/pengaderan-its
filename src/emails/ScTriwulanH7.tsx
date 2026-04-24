import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface ScTriwulanH7Props {
  userName?: string;
  triwulanName?: string;
  reviewDate?: string;
  triwulanUrl?: string;
  unsubscribeToken?: string;
}

export function ScTriwulanH7({ userName = 'SC', triwulanName = 'Triwulan', reviewDate = '', triwulanUrl, unsubscribeToken = '' }: ScTriwulanH7Props) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = triwulanUrl ?? `${baseUrl}/dashboard/triwulan`;
  return (
    <BaseLayout preview={`H-7: Persiapan Review Triwulan ${triwulanName}`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>H-7: Persiapan Review Triwulan {triwulanName}</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Review <strong>Triwulan {triwulanName}</strong> {reviewDate && `pada ${reviewDate}`} tinggal <strong>7 hari lagi</strong>.
        Siapkan semua materi dan data yang diperlukan.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={fillUrl} style={{ background: 'linear-gradient(to right, #0ea5e9, #2563eb)', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Persiapkan Triwulan
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}
export default ScTriwulanH7;
