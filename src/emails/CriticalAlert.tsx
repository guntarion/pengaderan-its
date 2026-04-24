/**
 * src/emails/CriticalAlert.tsx
 * NAWASENA M15 — Critical alert email (shared for Safeguard RED + MH RED).
 * Title is passed via props.
 */

import React from 'react';
import { BaseLayout } from './BaseLayout';

interface CriticalAlertProps {
  userName?: string;
  alertTitle?: string;
  alertBody?: string;
  actionUrl?: string;
  actionLabel?: string;
  incidentId?: string;
  screeningId?: string;
}

export function CriticalAlert({
  userName = 'Petugas',
  alertTitle = 'Peringatan Kritis',
  alertBody = 'Ada situasi yang membutuhkan tindakan segera.',
  actionUrl,
  actionLabel = 'Lihat Detail',
}: CriticalAlertProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const detailUrl = actionUrl ?? baseUrl;

  return (
    <BaseLayout preview={`[KRITIS] ${alertTitle} — Tindakan Segera Diperlukan`}>
      {/* Critical Banner */}
      <div style={{
        backgroundColor: '#fef2f2',
        border: '2px solid #fecaca',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
          PERINGATAN KRITIS
        </p>
        <p style={{ color: '#b91c1c', fontSize: '12px', margin: '4px 0 0' }}>
          Tindakan segera diperlukan
        </p>
      </div>

      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
        {alertTitle}
      </h2>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Hei <strong>{userName}</strong>,
      </p>
      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        {alertBody}
      </p>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a
          href={detailUrl}
          style={{
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '12px 32px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'inline-block',
          }}
        >
          {actionLabel}
        </a>
      </div>
      <div style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '12px',
        marginTop: '16px',
      }}>
        <p style={{ color: '#b91c1c', fontSize: '12px', margin: 0 }}>
          Email ini dikirim sebagai <strong>notifikasi darurat</strong> yang tidak dapat di-nonaktifkan.
          Ini demi keamanan seluruh anggota NAWASENA.
        </p>
      </div>
    </BaseLayout>
  );
}

export default CriticalAlert;
