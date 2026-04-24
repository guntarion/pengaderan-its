import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface OcSetupH7Props {
  userName?: string;
  eventName?: string;
  eventDate?: string;
  setupUrl?: string;
  unsubscribeToken?: string;
}

export function OcSetupH7({ userName = 'OC', eventName = 'Kegiatan', eventDate = '', setupUrl, unsubscribeToken = '' }: OcSetupH7Props) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = setupUrl ?? `${baseUrl}/dashboard/events`;
  return (
    <BaseLayout preview={`H-7: Setup Kegiatan ${eventName} — ${eventDate}`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>H-7: Setup Kegiatan {eventName}</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Kegiatan <strong>{eventName}</strong> {eventDate && `(${eventDate})`} tinggal <strong>7 hari lagi</strong>.
        Pastikan semua setup kegiatan sudah dilakukan tepat waktu.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={fillUrl} style={{ background: 'linear-gradient(to right, #0ea5e9, #2563eb)', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Setup Kegiatan Sekarang
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}
export default OcSetupH7;
