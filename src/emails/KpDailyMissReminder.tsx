/**
 * src/emails/KpDailyMissReminder.tsx
 * NAWASENA M09 — KP missed daily stand-up reminder email.
 * Sent on weekdays at 21:00 WIB to KP who have NOT submitted their daily log.
 */

import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface KpDailyMissReminderProps {
  userName?: string;
  dailyUrl?: string;
  missedDate?: string;
  unsubscribeToken?: string;
}

export function KpDailyMissReminder({
  userName = 'KP',
  dailyUrl,
  missedDate,
  unsubscribeToken = '',
}: KpDailyMissReminderProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = dailyUrl ?? `${baseUrl}/dashboard/kp/log/daily`;
  const dateLabel = missedDate ?? 'hari ini';
  return (
    <BaseLayout preview={`${userName}, kamu belum mengisi Log Harian KP ${dateLabel}. Masih ada waktu!`}>
      {/* Warning banner */}
      <div
        style={{
          backgroundColor: '#fffbeb',
          border: '2px solid #fde68a',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#b45309', fontWeight: 'bold', fontSize: '15px', margin: 0 }}>
          Log Harian Belum Diisi
        </p>
        <p style={{ color: '#92400e', fontSize: '12px', margin: '4px 0 0' }}>
          {dateLabel}
        </p>
      </div>

      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
        Kamu Belum Mengisi Log Harian KP
      </h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Hei <strong>{userName}</strong>,
      </p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Kami mencatat bahwa kamu belum mengisi <strong>Log Harian KP</strong> untuk {dateLabel}.
        Log harian dapat diisi hingga tengah malam — masih ada waktu!
      </p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Jika kamu lupa mengisi hari ini, kamu masih dapat mengedit log dalam jendela waktu <strong>48 jam</strong>.
        Pastikan data kelompok kamu tercatat agar SC dapat memantau kondisi Maba secara akurat.
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a
          href={fillUrl}
          style={{
            background: 'linear-gradient(to right, #f59e0b, #d97706)',
            color: 'white',
            padding: '12px 32px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'inline-block',
          }}
        >
          Isi Log Sekarang
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}

export default KpDailyMissReminder;
