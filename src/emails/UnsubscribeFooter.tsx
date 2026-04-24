/**
 * src/emails/UnsubscribeFooter.tsx
 * NAWASENA M15 — Unsubscribe footer for email templates.
 * Used as a partial inside email components.
 */

import React from 'react';

interface UnsubscribeFooterProps {
  unsubscribeToken: string;
}

export function UnsubscribeFooter({ unsubscribeToken }: UnsubscribeFooterProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const unsubscribeUrl = `${baseUrl}/api/notifications/unsubscribe?token=${unsubscribeToken}`;

  return (
    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e0f2fe', textAlign: 'center' }}>
      <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0 }}>
        Tidak ingin menerima email ini?{' '}
        <a
          href={unsubscribeUrl}
          style={{ color: '#0ea5e9', textDecoration: 'underline' }}
        >
          Berhenti berlangganan email ini
        </a>
        {'. '}
        Notifikasi kategori darurat (Safeguard, Mental Health) tetap terkirim demi keamanan kamu.
      </p>
    </div>
  );
}

export default UnsubscribeFooter;
