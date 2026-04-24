import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface KpStandupDailyProps {
  userName?: string;
  standupUrl?: string;
  unsubscribeToken?: string;
}

export function KpStandupDaily({ userName = 'KP', standupUrl, unsubscribeToken = '' }: KpStandupDailyProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = standupUrl ?? `${baseUrl}/dashboard/standup`;
  return (
    <BaseLayout preview={`Hei ${userName}, sudahkah kamu mengisi Stand-up harian hari ini?`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>Pengingat: Stand-up Harian KP</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Sudahkah kamu mengisi <strong>Stand-up Harian</strong> hari ini? Bagikan perkembangan
        kelompok KP kamu dan rencana hari ini.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={fillUrl} style={{ background: 'linear-gradient(to right, #0ea5e9, #2563eb)', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Isi Stand-up Sekarang
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}
export default KpStandupDaily;
