/**
 * src/emails/MhReferralSac.tsx
 * NAWASENA M11 — CRITICAL email to SAC counselor: new MH referral.
 *
 * PRIVACY-CRITICAL: NO Maba PII in this template.
 * Shows referral ID (first 8 chars), SLA deadline, immediateContact flag, queue link.
 *
 * Category: CRITICAL — NO unsubscribe footer.
 */

import React from 'react';

interface MhReferralSacProps {
  referralId: string;
  slaDeadlineAt: string; // ISO 8601
  immediateContact: boolean;
  queueUrl?: string;
}

function formatWIB(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' WIB';
  } catch {
    return isoString;
  }
}

export function MhReferralSac({
  referralId,
  slaDeadlineAt,
  immediateContact,
  queueUrl,
}: MhReferralSacProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const queueLink = queueUrl ?? `${baseUrl}/dashboard/sac/screening-queue`;
  const shortId = referralId.slice(0, 8).toUpperCase();
  const deadline = formatWIB(slaDeadlineAt);

  const headerBg = immediateContact
    ? 'linear-gradient(to right, #dc2626, #f97316)'
    : 'linear-gradient(to right, #0d9488, #0ea5e9)';

  const urgencyLabel = immediateContact
    ? 'KONTAK SEGERA dalam 24 jam'
    : 'Dalam 72 jam';

  const urgencyColor = immediateContact ? '#dc2626' : '#0d9488';

  const preview = immediateContact
    ? `[SEGERA] Referral Baru #${shortId} — Respon dalam 24 jam`
    : `Referral Baru #${shortId} — Pendampingan dibutuhkan`;

  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>{preview}</div>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f0f9ff', fontFamily: 'Arial, sans-serif' }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#f0f9ff', padding: '24px 16px' }}>
          <tbody>
            <tr>
              <td align="center">
                <table width="600" cellPadding={0} cellSpacing={0} style={{ maxWidth: '600px', width: '100%' }}>
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td style={{
                        background: headerBg,
                        borderRadius: '16px 16px 0 0',
                        padding: '24px',
                        textAlign: 'center',
                      }}>
                        <h1 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: 'bold' }}>
                          Referral Baru: Pendampingan Dibutuhkan
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.9)', margin: '6px 0 0', fontSize: '13px' }}>
                          NAWASENA — Sistem Kesehatan Mental ITS
                        </p>
                      </td>
                    </tr>
                    {/* Content */}
                    <tr>
                      <td style={{
                        backgroundColor: 'white',
                        padding: '32px 24px',
                        borderLeft: '1px solid #e0f2fe',
                        borderRight: '1px solid #e0f2fe',
                      }}>
                        {/* Urgency badge */}
                        <div style={{
                          backgroundColor: immediateContact ? '#fef2f2' : '#f0fdfa',
                          border: `2px solid ${urgencyColor}`,
                          borderRadius: '10px',
                          padding: '12px 16px',
                          marginBottom: '24px',
                          textAlign: 'center',
                        }}>
                          <p style={{
                            color: urgencyColor,
                            fontWeight: 'bold',
                            fontSize: '15px',
                            margin: 0,
                          }}>
                            {urgencyLabel}
                          </p>
                        </div>

                        <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6', marginTop: 0 }}>
                          Anda memiliki referral baru yang perlu ditindaklanjuti.
                          Silakan masuk ke antrean skrining dan proses kasus ini sesuai SLA yang berlaku.
                        </p>

                        {/* Referral details */}
                        <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: '24px' }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>ID Referral</span>
                              </td>
                              <td style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                                <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                  {shortId}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>Batas Waktu SLA</span>
                              </td>
                              <td style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                                <span style={{ color: urgencyColor, fontSize: '13px', fontWeight: 'bold' }}>
                                  {deadline}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px 0' }}>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>Prioritas</span>
                              </td>
                              <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                <span style={{
                                  backgroundColor: immediateContact ? '#dc2626' : '#0d9488',
                                  color: 'white',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                }}>
                                  {immediateContact ? 'MENDESAK' : 'NORMAL'}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.6' }}>
                          Catatan: Identitas mahasiswa tidak tercantum dalam email ini demi menjaga kerahasiaan data.
                          Detail kasus dapat diakses melalui antrean skrining SAC.
                        </p>

                        <div style={{ textAlign: 'center', margin: '28px 0 0' }}>
                          <a
                            href={queueLink}
                            style={{
                              background: immediateContact
                                ? 'linear-gradient(to right, #dc2626, #f97316)'
                                : 'linear-gradient(to right, #0d9488, #0ea5e9)',
                              color: 'white',
                              padding: '12px 32px',
                              borderRadius: '12px',
                              textDecoration: 'none',
                              fontWeight: 'bold',
                              fontSize: '14px',
                              display: 'inline-block',
                            }}
                          >
                            Buka Antrean Skrining
                          </a>
                        </div>
                      </td>
                    </tr>
                    {/* Footer — NO unsubscribe (CRITICAL category) */}
                    <tr>
                      <td style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '0 0 16px 16px',
                        padding: '16px 24px',
                        borderTop: '1px solid #e0f2fe',
                        borderLeft: '1px solid #e0f2fe',
                        borderRight: '1px solid #e0f2fe',
                        borderBottom: '1px solid #e0f2fe',
                        textAlign: 'center',
                      }}>
                        <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>
                          Notifikasi ini merupakan pemberitahuan darurat sistem NAWASENA ITS
                          dan tidak dapat dihentikan berlangganannya.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export default MhReferralSac;
