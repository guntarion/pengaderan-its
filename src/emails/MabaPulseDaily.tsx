/**
 * src/emails/MabaPulseDaily.tsx
 * NAWASENA M15 — Daily Maba Pulse reminder email template.
 */

import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface MabaPulseDailyProps {
  userName?: string;
  pulseUrl?: string;
  unsubscribeToken?: string;
}

export function MabaPulseDaily({ userName = 'Maba', pulseUrl, unsubscribeToken = '' }: MabaPulseDailyProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = pulseUrl ?? `${baseUrl}/dashboard/pulse`;

  return (
    <BaseLayout preview={`Hei ${userName}, jangan lupa isi Pulse harian kamu hari ini!`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
        Pengingat: Isi Pulse Harian
      </h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Hei <strong>{userName}</strong>,
      </p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Saatnya mengisi <strong>Pulse Harian</strong> kamu hari ini! Pulse adalah cara kamu
        berbagi kondisi dan perkembangan kamu dengan KP dan tim NAWASENA.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a
          href={fillUrl}
          style={{
            background: 'linear-gradient(to right, #0ea5e9, #2563eb)',
            color: 'white',
            padding: '12px 32px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'inline-block',
          }}
        >
          Isi Pulse Sekarang
        </a>
      </div>
      <p style={{ color: '#64748b', fontSize: '12px' }}>
        Hanya butuh 2–3 menit. Konsisten adalah kunci!
      </p>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}

export default MabaPulseDaily;
