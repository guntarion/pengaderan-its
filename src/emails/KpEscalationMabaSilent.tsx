import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface KpEscalationMabaSilentProps {
  userName?: string;
  mabaName?: string;
  formType?: string;
  missCount?: number;
  unsubscribeToken?: string;
}

export function KpEscalationMabaSilent({ userName = 'KP', mabaName = 'Maba', formType = 'form', missCount, unsubscribeToken = '' }: KpEscalationMabaSilentProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const profileUrl = `${baseUrl}/dashboard`;
  return (
    <BaseLayout preview={`${mabaName} berulang kali tidak mengisi ${formType} — mohon follow-up.`}>
      <div style={{ backgroundColor: '#fffbeb', border: '2px solid #fde68a', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
        <p style={{ color: '#d97706', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>ESKALASI: Maba Tidak Merespons</p>
      </div>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>Eskalasi: {mabaName} Berulang Kali Tidak Mengisi</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        <strong>{mabaName}</strong> telah berulang kali {missCount && `(${missCount}x) `}tidak mengisi <strong>{formType}</strong>.
        Mohon lakukan follow-up langsung kepada yang bersangkutan.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={profileUrl} style={{ background: 'linear-gradient(to right, #f59e0b, #d97706)', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Lihat Dashboard KP
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}
export default KpEscalationMabaSilent;
