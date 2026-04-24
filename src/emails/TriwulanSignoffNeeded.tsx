import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface TriwulanSignoffNeededProps {
  userName?: string;
  triwulanName?: string;
  submittedBy?: string;
  triwulanUrl?: string;
  unsubscribeToken?: string;
}

export function TriwulanSignoffNeeded({ userName = 'Pembina', triwulanName = 'Triwulan', submittedBy = 'SC', triwulanUrl, unsubscribeToken = '' }: TriwulanSignoffNeededProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = triwulanUrl ?? `${baseUrl}/admin/triwulan`;
  return (
    <BaseLayout preview={`Review Triwulan ${triwulanName} dari ${submittedBy} menunggu sign-off kamu.`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>Triwulan Perlu Sign-off</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Review <strong>Triwulan {triwulanName}</strong> dari <strong>{submittedBy}</strong> telah
        disubmit dan membutuhkan <strong>sign-off</strong> dari kamu.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={fillUrl} style={{ background: 'linear-gradient(to right, #0ea5e9, #2563eb)', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Review & Sign-off
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}
export default TriwulanSignoffNeeded;
