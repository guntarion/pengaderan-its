import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface KpDebriefWeeklyProps {
  userName?: string;
  debriefUrl?: string;
  unsubscribeToken?: string;
}

export function KpDebriefWeekly({ userName = 'KP', debriefUrl, unsubscribeToken = '' }: KpDebriefWeeklyProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = debriefUrl ?? `${baseUrl}/dashboard/debrief`;
  return (
    <BaseLayout preview={`Hei ${userName}, jangan lupa mengisi Debrief Mingguan KP kamu!`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>Pengingat: Debrief Mingguan KP</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Awal minggu ini, jangan lupa mengisi <strong>Debrief Mingguan KP</strong>. Refleksikan
        minggu lalu dan rencanakan strategi minggu ini untuk kelompok kamu.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={fillUrl} style={{ background: 'linear-gradient(to right, #0ea5e9, #2563eb)', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Isi Debrief Sekarang
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}
export default KpDebriefWeekly;
