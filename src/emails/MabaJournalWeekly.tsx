import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface MabaJournalWeeklyProps {
  userName?: string;
  journalUrl?: string;
  weekNumber?: number;
  unsubscribeToken?: string;
}

export function MabaJournalWeekly({ userName = 'Maba', journalUrl, weekNumber, unsubscribeToken = '' }: MabaJournalWeeklyProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = journalUrl ?? `${baseUrl}/dashboard/journal`;
  return (
    <BaseLayout preview={`Hei ${userName}, saatnya refleksi di Jurnal Mingguan!`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
        Pengingat: Jurnal Mingguan{weekNumber ? ` Minggu ${weekNumber}` : ''}
      </h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Saatnya refleksi seminggu ini di <strong>Jurnal Mingguan</strong>! Ceritakan perkembangan dan
        pengalamanmu selama minggu ini.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a href={fillUrl} style={{ background: 'linear-gradient(to right, #0ea5e9, #2563eb)', color: 'white', padding: '12px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }}>
          Tulis Jurnal Sekarang
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}
export default MabaJournalWeekly;
