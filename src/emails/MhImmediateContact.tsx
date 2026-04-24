/**
 * src/emails/MhImmediateContact.tsx
 * NAWASENA M11 — CRITICAL email to SAC: 24-hour SLA override (immediate contact needed).
 *
 * PRIVACY-CRITICAL: NO Maba PII. Shows referralId and 24h deadline only.
 *
 * Category: CRITICAL — NO unsubscribe footer.
 * Red urgent header.
 */

import React from 'react';

interface MhImmediateContactProps {
  referralId: string;
  slaDeadlineAt: string; // ISO 8601 — should be ~24h from creation
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

export function MhImmediateContact({
  referralId,
  slaDeadlineAt,
  queueUrl,
}: MhImmediateContactProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const queueLink = queueUrl ?? `${baseUrl}/dashboard/sac/screening-queue`;
  const shortId = referralId.slice(0, 8).toUpperCase();
  const deadline = formatWIB(slaDeadlineAt);

  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
          [SEGERA] Referral #{shortId} — Respons diperlukan dalam 24 jam
        </div>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#fff1f2', fontFamily: 'Arial, sans-serif' }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#fff1f2', padding: '24px 16px' }}>
          <tbody>
            <tr>
              <td align="center">
                <table width="600" cellPadding={0} cellSpacing={0} style={{ maxWidth: '600px', width: '100%' }}>
                  <tbody>
                    {/* Urgent red header */}
                    <tr>
                      <td style={{
                        background: 'linear-gradient(to right, #7f1d1d, #dc2626)',
                        borderRadius: '16px 16px 0 0',
                        padding: '24px',
                        textAlign: 'center',
                      }}>
                        <p style={{
                          color: '#fca5a5',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          letterSpacing: '2px',
                          margin: '0 0 6px',
                          textTransform: 'uppercase',
                        }}>
                          TINDAKAN SEGERA DIPERLUKAN
                        </p>
                        <h1 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: 'bold' }}>
                          Pendampingan Memerlukan Respons 24 Jam
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
                        borderLeft: '1px solid #fecaca',
                        borderRight: '1px solid #fecaca',
                      }}>
                        {/* Critical alert box */}
                        <div style={{
                          backgroundColor: '#fef2f2',
                          border: '2px solid #dc2626',
                          borderRadius: '10px',
                          padding: '16px',
                          marginBottom: '24px',
                          textAlign: 'center',
                        }}>
                          <p style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px' }}>
                            SLA: 24 JAM
                          </p>
                          <p style={{ color: '#991b1b', fontSize: '13px', margin: 0 }}>
                            Batas waktu respons: <strong>{deadline}</strong>
                          </p>
                        </div>

                        <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6', marginTop: 0 }}>
                          Anda menerima referral dengan prioritas <strong>KONTAK SEGERA</strong>.
                          Sistem telah menilai bahwa kasus ini memerlukan respons dalam 24 jam.
                        </p>

                        <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
                          Mohon segera masuk ke sistem dan proses kasus ini. Keterlambatan melampaui 24 jam
                          akan memicu eskalasi otomatis ke koordinator Poli Psikologi.
                        </p>

                        {/* Detail */}
                        <table width="100%" cellPadding={0} cellSpacing={0} style={{
                          margin: '20px 0',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                        }}>
                          <tbody>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '13px' }}>
                                ID Referral
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                  {shortId}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>
                                Batas Waktu
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', borderTop: '1px solid #e2e8f0' }}>
                                <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 'bold' }}>
                                  {deadline}
                                </span>
                              </td>
                            </tr>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>
                                Prioritas
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', borderTop: '1px solid #e2e8f0' }}>
                                <span style={{
                                  backgroundColor: '#dc2626',
                                  color: 'white',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  padding: '3px 10px',
                                  borderRadius: '999px',
                                }}>
                                  MENDESAK
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.6' }}>
                          Identitas mahasiswa tidak dicantumkan dalam email ini.
                          Detail lengkap tersedia di sistem SAC setelah Anda masuk.
                        </p>

                        <div style={{ textAlign: 'center', margin: '28px 0 0' }}>
                          <a
                            href={queueLink}
                            style={{
                              background: 'linear-gradient(to right, #7f1d1d, #dc2626)',
                              color: 'white',
                              padding: '14px 36px',
                              borderRadius: '12px',
                              textDecoration: 'none',
                              fontWeight: 'bold',
                              fontSize: '15px',
                              display: 'inline-block',
                            }}
                          >
                            Buka Antrean Skrining SEKARANG
                          </a>
                        </div>
                      </td>
                    </tr>
                    {/* Footer — NO unsubscribe (CRITICAL category) */}
                    <tr>
                      <td style={{
                        backgroundColor: '#fef2f2',
                        borderRadius: '0 0 16px 16px',
                        padding: '16px 24px',
                        border: '1px solid #fecaca',
                        textAlign: 'center',
                      }}>
                        <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>
                          Notifikasi darurat sistem NAWASENA ITS — tidak dapat dihentikan berlangganannya.
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

export default MhImmediateContact;
