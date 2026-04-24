/**
 * src/emails/KpDailyReminder.tsx
 * NAWASENA M09 — KP daily stand-up reminder email.
 * Sent on weekdays at 17:00 WIB to KP who have not yet submitted their daily log.
 */

import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface KpDailyReminderProps {
  userName?: string;
  dailyUrl?: string;
  unsubscribeToken?: string;
}

export function KpDailyReminder({ userName = 'KP', dailyUrl, unsubscribeToken = '' }: KpDailyReminderProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const fillUrl = dailyUrl ?? `${baseUrl}/dashboard/kp/log/daily`;
  return (
    <BaseLayout preview={`Hei ${userName}, sudahkah kamu mengisi Log Harian KP hari ini?`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>Pengingat: Log Harian KP</h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>Hei <strong>{userName}</strong>,</p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Sudahkah kamu mengisi <strong>Log Harian KP</strong> hari ini? Catat suasana hati, isu yang
        dihadapi kelompok, dan rencana tindak lanjut untuk hari ini.
      </p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Pengisian log harian membantu kamu dan tim SC memantau kondisi seluruh Maba secara tepat waktu.
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
          Isi Log Harian Sekarang
        </a>
      </div>
      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}

export default KpDailyReminder;
