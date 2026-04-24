import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface PassportVerifyPendingProps {
  userName?: string;
  mabaName?: string;
  passportEntryId?: string;
  verifyUrl?: string;
  unsubscribeToken?: string;
}

export function PassportVerifyPending({ userName = 'Verifier', mabaName = 'Maba', passportEntryId, verifyUrl, unsubscribeToken = '' }: PassportVerifyPendingProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = verifyUrl ?? `${baseUrl}/dashboard/passport`;
  return (
    <BaseLayout preview={`${mabaName} mengirimkan entri Passport yang menunggu verifikasi kamu.`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>Entri Passport Menunggu Verifikasi</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        <strong>{mabaName}</strong> mengirimkan entri Passport{passportEntryId ? ` (ID: ${passportEntryId})` : ''} yang
        membutuhkan <strong>verifikasi</strong> dari kamu.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={fillUrl} style={{ background: 'linear-gradient(to right, #0ea5e9, #2563eb)', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Verifikasi Sekarang
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}
export default PassportVerifyPending;
