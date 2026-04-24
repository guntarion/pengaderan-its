/**
 * src/app/(DashboardLayout)/dashboard/mental-health/consent/page.tsx
 * NAWASENA M11 — MH Consent page (server component loads consent markdown).
 *
 * Server-renders the consent text from src/content/mh-consent/v1.md.
 * Passes it to the client ConsentScreen component.
 * After accept → redirect to /dashboard/mental-health/form.
 * After decline → redirect to /dashboard.
 *
 * No session check here — DashboardLayout handles auth.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import ConsentPageClient from './ConsentPageClient';

export const metadata = {
  title: 'Persetujuan Skrining Kesehatan Mental — NAWASENA',
};

// Current consent version — must match filename and consentVersion param
const CONSENT_VERSION = 'v1.0';

export default async function ConsentPage() {
  // Load consent markdown server-side (never from client)
  const consentPath = path.join(process.cwd(), 'src/content/mh-consent/v1.md');
  let consentMarkdown = '';

  try {
    consentMarkdown = await readFile(consentPath, 'utf-8');
  } catch {
    consentMarkdown =
      '**Teks persetujuan sedang dimuat. Jika masalah berlanjut, hubungi SAC HMTC.**';
  }

  return (
    <ConsentPageClient
      consentMarkdown={consentMarkdown}
      consentVersion={CONSENT_VERSION}
    />
  );
}
