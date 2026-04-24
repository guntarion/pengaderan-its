/**
 * src/emails/MhSupportAlertKp.tsx
 * NAWASENA M11 — NORMAL email to KP: anonymous support alert.
 *
 * PRIVACY-CRITICAL: Completely anonymous. NO Maba name, NO userId, NO referral ID.
 * Only informs KP that a group member may need extra support.
 *
 * Category: NORMAL — HAS unsubscribe footer.
 */

import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface MhSupportAlertKpProps {
  tipsLink?: string;
  unsubscribeToken?: string;
}

export function MhSupportAlertKp({
  tipsLink,
  unsubscribeToken = '',
}: MhSupportAlertKpProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const helpLink = tipsLink ?? `${baseUrl}/mental-health/help-seeking`;

  return (
    <BaseLayout preview="Informasi Dukungan KP Group — Ada anggota yang mungkin membutuhkan perhatian ekstra.">
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
        Informasi Dukungan KP Group
      </h2>

      <div style={{
        backgroundColor: '#f0fdfa',
        border: '1px solid #99f6e4',
        borderRadius: '10px',
        padding: '16px',
        marginBottom: '20px',
      }}>
        <p style={{ color: '#0f766e', fontSize: '13px', margin: 0, fontWeight: 'bold' }}>
          Catatan Penting — Baca Sebelum Melanjutkan
        </p>
        <p style={{ color: '#134e4a', fontSize: '13px', margin: '8px 0 0', lineHeight: '1.6' }}>
          Email ini bersifat anonim sepenuhnya. Nama atau identitas anggota tidak dicantumkan,
          dan sistem tidak memungkinkan identifikasi individu.
        </p>
      </div>

      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Ada anggota di KP Group Anda yang mungkin membutuhkan <strong>dukungan ekstra</strong> saat ini.
        Mohon perhatikan kondisi seluruh anggota secara umum dan berikan lingkungan yang suportif.
      </p>

      <div style={{
        backgroundColor: '#fff7ed',
        border: '1px solid #fed7aa',
        borderRadius: '10px',
        padding: '16px',
        margin: '20px 0',
      }}>
        <p style={{ color: '#92400e', fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px' }}>
          Yang TIDAK boleh dilakukan:
        </p>
        <ul style={{ color: '#92400e', fontSize: '13px', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
          <li>JANGAN bertanya langsung kepada siapapun tentang kondisi mereka secara spesifik</li>
          <li>JANGAN mengungkap informasi ini kepada anggota lain</li>
          <li>JANGAN mencoba mengidentifikasi siapa yang dimaksud</li>
        </ul>
      </div>

      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Yang bisa Anda lakukan adalah menciptakan suasana kelompok yang hangat, inklusif, dan bebas tekanan.
        Pastikan semua anggota merasa aman untuk berbagi atau meminta bantuan kapan saja.
      </p>

      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Jika ada anggota yang secara sukarela mendatangi Anda dan berbagi perasaan mereka,
        dengarkan dengan empati dan arahkan ke SAC ITS melalui tautan di bawah.
      </p>

      <div style={{ textAlign: 'center', margin: '28px 0' }}>
        <a
          href={helpLink}
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
          Panduan Mencari Bantuan
        </a>
      </div>

      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}

export default MhSupportAlertKp;
