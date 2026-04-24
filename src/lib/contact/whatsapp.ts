/**
 * src/lib/contact/whatsapp.ts
 * WhatsApp deep link URL builder.
 *
 * Format: https://wa.me/62{phone}?text={encodedMessage}
 * Handles Indonesian phone number format (08xxx → 628xxx, +628xxx → 628xxx).
 */

/**
 * Normalize Indonesian phone number to E.164 without leading +.
 * Examples:
 *   "08123456789" → "628123456789"
 *   "+628123456789" → "628123456789"
 *   "628123456789" → "628123456789"
 */
export function normalizeIndonesianPhone(phone: string): string | null {
  if (!phone) return null;

  // Strip spaces, dashes, dots
  const cleaned = phone.replace(/[\s\-\.()\+]/g, '');

  if (cleaned.startsWith('08')) {
    return `62${cleaned.slice(1)}`;
  } else if (cleaned.startsWith('628')) {
    return cleaned;
  } else if (cleaned.startsWith('8') && cleaned.length >= 9) {
    return `62${cleaned}`;
  }

  return null; // Cannot normalize
}

/**
 * Build a WhatsApp deep link URL.
 * Returns null if phone number cannot be normalized.
 */
export function buildWhatsAppUrl(phone: string, message?: string): string | null {
  const normalized = normalizeIndonesianPhone(phone);
  if (!normalized) return null;

  const base = `https://wa.me/${normalized}`;
  if (!message) return base;

  return `${base}?text=${encodeURIComponent(message)}`;
}

/**
 * Build a greeting message for WhatsApp (to be passed as `message?`).
 */
export function buildGreetingMessage(recipientName: string, senderName?: string): string {
  if (senderName) {
    return `Halo ${recipientName}! Perkenalkan, saya ${senderName} dari NAWASENA.`;
  }
  return `Halo ${recipientName}! Salam dari NAWASENA.`;
}
