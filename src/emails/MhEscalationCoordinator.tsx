/**
 * src/emails/MhEscalationCoordinator.tsx
 * NAWASENA M11 — CRITICAL email to Poli Psikologi coordinator: SLA exceeded escalation.
 *
 * PRIVACY-CRITICAL: NO Maba name in this email.
 * Shows referralId, originalSACId (not Maba), escalatedAt timestamp.
 *
 * Category: CRITICAL — NO unsubscribe footer.
 */

import React from 'react';

interface MhEscalationCoordinatorProps {
  referralId: string;
  originalSACId: string;
  escalatedAt: string; // ISO 8601
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

export function MhEscalationCoordinator({
  referralId,
  originalSACId,
  escalatedAt,
}: MhEscalationCoordinatorProps) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nawasena.its.ac.id';
  const queueLink = `${baseUrl}/dashboard/sac/screening-queue`;
  const shortId = referralId.slice(0, 8).toUpperCase();
  const shortSacId = originalSACId.slice(0, 8).toUpperCase();
  const escalatedStr = formatWIB(escalatedAt);

  return (
    <html>
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
          [ESKALASI] Referral #{shortId} — SLA Terlampaui, Tindakan Segera Diperlukan
        </div>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#fff1f2', fontFamily: 'Arial, sans-serif' }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#fff1f2', padding: '24px 16px' }}>
          <tbody>
            <tr>
              <td align="center">
                <table width="600" cellPadding={0} cellSpacing={0} style={{ maxWidth: '600px', width: '100%' }}>
                  <tbody>
                    {/* Red header */}
                    <tr>
                      <td style={{
                        background: 'linear-gradient(to right, #991b1b, #dc2626)',
                        borderRadius: '16px 16px 0 0',
                        padding: '24px',
                        textAlign: 'center',
                      }}>
                        <h1 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: 'bold' }}>
                          Eskalasi Referral: SLA Terlampaui
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
                        {/* Alert banner */}
                        <div style={{
                          backgroundColor: '#fef2f2',
                          border: '2px solid #dc2626',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          marginBottom: '24px',
                          textAlign: 'center',
                        }}>
                          <p style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '15px', margin: 0 }}>
                            Referral ini telah melampaui batas waktu SLA dan perlu perhatian segera.
                          </p>
                        </div>

                        <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6', marginTop: 0 }}>
                          Koordinator Poli Psikologi yang terhormat,
                        </p>
                        <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
                          Sebuah referral kesehatan mental telah dieskalasi secara otomatis oleh sistem
                          karena melampaui batas waktu SLA tanpa penanganan. Mohon tindak lanjut segera.
                        </p>

                        {/* Detail table */}
                        <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: '24px' }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>ID Referral</span>
                              </td>
                              <td style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                                <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                  {shortId}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>ID SAC Asal</span>
                              </td>
                              <td style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                                <span style={{ color: '#0f172a', fontSize: '13px', fontFamily: 'monospace' }}>
                                  {shortSacId}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '10px 0' }}>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>Waktu Eskalasi</span>
                              </td>
                              <td style={{ padding: '10px 0', textAlign: 'right' }}>
                                <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 'bold' }}>
                                  {escalatedStr}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.6' }}>
                          Identitas mahasiswa tidak dicantumkan dalam notifikasi ini demi menjaga kerahasiaan data.
                          Detail lengkap dapat diakses melalui sistem SAC dengan kewenangan koordinator.
                        </p>

                        <div style={{ textAlign: 'center', margin: '28px 0 0' }}>
                          <a
                            href={queueLink}
                            style={{
                              background: 'linear-gradient(to right, #991b1b, #dc2626)',
                              color: 'white',
                              padding: '12px 32px',
                              borderRadius: '12px',
                              textDecoration: 'none',
                              fontWeight: 'bold',
                              fontSize: '14px',
                              display: 'inline-block',
                            }}
                          >
                            Buka Sistem SAC
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
                          Notifikasi eskalasi darurat sistem NAWASENA ITS — tidak dapat dihentikan berlangganannya.
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

export default MhEscalationCoordinator;
