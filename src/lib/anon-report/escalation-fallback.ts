/**
 * src/lib/anon-report/escalation-fallback.ts
 * NAWASENA M12 — Fallback dispatch when M15 notification system is unavailable.
 *
 * Uses nodemailer SMTP to send minimal escalation emails.
 * Content: trackingCode, category, severity ONLY — NO body, NO attachment.
 *
 * Gracefully skips if EMAIL_HOST is not configured.
 * Increments anon_fallback_dispatch_count metric for monitoring.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('anon-escalation-fallback');

/** Metric counter for monitoring (in-process, reset on restart) */
let fallbackDispatchCount = 0;

/**
 * Get current fallback dispatch count (for metrics endpoint).
 */
export function getFallbackDispatchCount(): number {
  return fallbackDispatchCount;
}

export interface FallbackReport {
  trackingCode: string;
  category: string;
  severity: string;
  cohortName: string;
}

/**
 * Direct SMTP dispatch to Satgas users when M15 is unavailable.
 *
 * Sends minimal info only — NO body text, NO attachment references.
 * Gracefully skips if EMAIL_HOST is not configured.
 *
 * @param satgasEmails - Array of email addresses to notify
 * @param report - Minimal report data (no PII, no body)
 */
export async function directDispatchSatgas(
  satgasEmails: string[],
  report: FallbackReport,
): Promise<void> {
  if (!process.env.EMAIL_HOST) {
    log.warn('EMAIL_HOST not configured — skipping fallback dispatch', {
      recipientCount: satgasEmails.length,
    });
    return;
  }

  if (satgasEmails.length === 0) {
    log.warn('No Satgas email recipients for fallback dispatch');
    return;
  }

  fallbackDispatchCount += 1;
  log.warn('Using fallback dispatch for Satgas escalation', {
    recipientCount: satgasEmails.length,
    fallbackDispatchCount,
    trackingCode: report.trackingCode,
  });

  try {
    // Dynamic import to avoid loading nodemailer in edge environments
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT ?? '587', 10),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const subject = `[NAWASENA URGENT] Laporan Anonim Diteruskan ke Satgas`;

    const text = [
      'Sistem NAWASENA M12 — Notifikasi Darurat',
      '',
      'Sebuah laporan anonim telah diteruskan ke Satgas PPKPT ITS.',
      '',
      `Kode Laporan  : ${report.trackingCode}`,
      `Kategori      : ${report.category}`,
      `Tingkat       : ${report.severity}`,
      `Kohort        : ${report.cohortName}`,
      '',
      'Login ke dashboard Satgas untuk melihat detail laporan.',
      '',
      '---',
      'Pesan ini dikirim otomatis oleh sistem NAWASENA.',
      'Jangan balas email ini.',
    ].join('\n');

    // Send to all Satgas officers
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? process.env.EMAIL_USERNAME,
      to: satgasEmails.join(', '),
      subject,
      text,
    });

    log.info('Fallback dispatch sent successfully', {
      recipientCount: satgasEmails.length,
      trackingCode: report.trackingCode,
    });
  } catch (err) {
    log.error('Fallback dispatch failed', {
      error: err,
      trackingCode: report.trackingCode,
    });
    // Don't re-throw — fallback failure should not block the submit flow
  }
}
