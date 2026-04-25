/**
 * src/emails/BaseLayout.tsx
 * NAWASENA M15 — Base email layout with ITS/NAWASENA branding.
 */

import React from 'react';

interface BaseLayoutProps {
  preview?: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <html>
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {preview && <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>{preview}</div>}
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f0f9ff', fontFamily: 'Arial, sans-serif' }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#f0f9ff', padding: '24px 16px' }}>
          <tbody>
            <tr>
              <td align="center">
                <table width="600" cellPadding={0} cellSpacing={0} style={{ maxWidth: '600px', width: '100%' }}>
                  {/* Header */}
                  <tbody>
                    <tr>
                      <td style={{
                        background: 'linear-gradient(to right, #0ea5e9, #2563eb)',
                        borderRadius: '16px 16px 0 0',
                        padding: '24px',
                        textAlign: 'center',
                      }}>
                        <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                          NAWASENA
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: '12px' }}>
                          Sistem Kaderisasi Himpunan Mahasiswa ITS
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
                        {children}
                      </td>
                    </tr>
                    {/* Footer */}
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
                          Email ini dikirim oleh sistem NAWASENA ITS.
                          Jika kamu tidak merasa mendaftar, abaikan email ini.
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

export default BaseLayout;
