/**
 * src/emails/MhRetentionWarning.tsx
 * NAWASENA M11 — NORMAL email to Maba: data retention deletion warning.
 *
 * Informs Maba that their screening data will be deleted,
 * and offers option to opt-in research consent to extend retention.
 *
 * Category: NORMAL — HAS unsubscribe footer.
 */

import React from 'react';
import { BaseLayout } from './BaseLayout';
import { UnsubscribeFooter } from './UnsubscribeFooter';

interface MhRetentionWarningProps {
  userName?: string;
  deletionDate: string; // ISO 8601
  privacyUrl?: string;
  unsubscribeToken?: string;
}

function formatWIB(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function MhRetentionWarning({
  userName = 'Mahasiswa',
  deletionDate,
  privacyUrl,
  unsubscribeToken = '',
}: MhRetentionWarningProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const privacyLink = privacyUrl ?? `${baseUrl}/dashboard/mental-health/privacy`;
  const deletionStr = formatWIB(deletionDate);

  return (
    <BaseLayout preview={`Pemberitahuan: Data skrining mental health Anda akan dihapus pada ${deletionStr}`}>
      <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 'bold', marginTop: 0 }}>
        Pemberitahuan Penghapusan Data Skrining
      </h2>

      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Hei <strong>{userName}</strong>,
      </p>

      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Sesuai kebijakan retensi data NAWASENA, data skrining kesehatan mental Anda
        akan dihapus secara permanen pada:
      </p>

      <div style={{
        backgroundColor: '#fff7ed',
        border: '1px solid #fed7aa',
        borderRadius: '10px',
        padding: '16px',
        textAlign: 'center',
        margin: '16px 0',
      }}>
        <p style={{ color: '#9a3412', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>
          {deletionStr}
        </p>
      </div>

      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Data yang akan dihapus mencakup jawaban skrining dan hasil asesmen yang tersimpan
        selama masa kaderisasi. Data Anda tidak akan dapat dipulihkan setelah dihapus.
      </p>

      <div style={{
        backgroundColor: '#f0fdfa',
        border: '1px solid #99f6e4',
        borderRadius: '10px',
        padding: '16px',
        margin: '20px 0',
      }}>
        <p style={{ color: '#0f766e', fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px' }}>
          Ingin mempertahankan data Anda lebih lama?
        </p>
        <p style={{ color: '#134e4a', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
          Anda dapat memilih untuk mengizinkan penggunaan data skrining Anda secara anonim
          untuk keperluan penelitian kesehatan mental mahasiswa. Jika Anda memberikan persetujuan,
          data akan dipertahankan hingga <strong>2 tahun</strong> dalam bentuk yang dianonimkan.
        </p>
      </div>

      <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        Kunjungi halaman Privasi untuk mengelola pengaturan retensi data Anda atau
        memberikan persetujuan penelitian.
      </p>

      <div style={{ textAlign: 'center', margin: '28px 0' }}>
        <a
          href={privacyLink}
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
          Kelola Pengaturan Privasi
        </a>
      </div>

      <p style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.6' }}>
        Jika Anda tidak melakukan tindakan apa pun, data akan dihapus secara otomatis sesuai jadwal.
        Tidak ada konsekuensi akademis dari penghapusan ini.
      </p>

      <UnsubscribeFooter unsubscribeToken={unsubscribeToken} />
    </BaseLayout>
  );
}

export default MhRetentionWarning;
