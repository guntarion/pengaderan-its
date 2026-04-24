import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface KasuhLogbookBiweeklyProps {
  userName?: string;
  logbookUrl?: string;
  unsubscribeToken?: string;
}

export function KasuhLogbookBiweekly({ userName = 'Kasuh', logbookUrl, unsubscribeToken = '' }: KasuhLogbookBiweeklyProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = logbookUrl ?? `${baseUrl}/dashboard/logbook`;
  return (
    <BaseLayout preview={`Hei ${userName}, saatnya membuka Logbook KASUH dua mingguan!`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>Pengingat: Logbook KASUH Dua Mingguan</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Waktunya membuka <strong>Logbook KASUH</strong> dua mingguan! Catat perkembangan pasangan
        KASUH kamu dan bagi pengalaman mendampingi mereka.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={fillUrl} style={{ background: 'linear-gradient(to right, #0ea5e9, #2563eb)', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Buka Logbook Sekarang
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}
export default KasuhLogbookBiweekly;
