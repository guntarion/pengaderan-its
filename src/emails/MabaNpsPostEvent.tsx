import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface MabaNpsPostEventProps {
  userName?: string;
  eventName?: string;
  npsUrl?: string;
  unsubscribeToken?: string;
}

export function MabaNpsPostEvent({ userName = 'Maba', eventName = 'Kegiatan', npsUrl, unsubscribeToken = '' }: MabaNpsPostEventProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = npsUrl ?? `${baseUrl}/dashboard/nps`;
  return (
    <BaseLayout preview={`Bagaimana kegiatan ${eventName}? Isi survey NPS sekarang!`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>Bagaimana Kegiatan {eventName}?</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Terima kasih sudah mengikuti <strong>{eventName}</strong>! Tolong luangkan 1–2 menit untuk
        mengisi <strong>Survey NPS</strong> agar kami bisa meningkatkan kegiatan selanjutnya.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={fillUrl} style={{ background: 'linear-gradient(to right, #0ea5e9, #2563eb)', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Isi Survey NPS
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}
export default MabaNpsPostEvent;
