'use client';

// Hidden CSRF token input for forms.
// Reads the token from the __csrf cookie and embeds it as a hidden field.
//
// Usage:
//   <form action="/api/submit" method="POST">
//     <CsrfInput />
//     <input name="name" />
//     <button type="submit">Submit</button>
//   </form>
//
// For fetch/XHR requests, use the useCsrfToken hook instead:
//   const csrfToken = useCsrfToken();
//   fetch('/api/submit', { headers: { 'x-csrf-token': csrfToken } });

import * as React from 'react';
import { CSRF_CONFIG } from '@/lib/csrf';

/**
 * Read the CSRF token from the cookie.
 */
function getCsrfTokenFromCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CSRF_CONFIG.cookieName}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Hidden input that embeds the CSRF token in form submissions.
 */
export function CsrfInput() {
  const [token, setToken] = React.useState('');

  React.useEffect(() => {
    setToken(getCsrfTokenFromCookie());
  }, []);

  return <input type="hidden" name={CSRF_CONFIG.bodyField} value={token} />;
}

/**
 * Hook to get the CSRF token for use in fetch/XHR requests.
 *
 *   const csrfToken = useCsrfToken();
 *   fetch('/api/data', {
 *     method: 'POST',
 *     headers: { 'x-csrf-token': csrfToken },
 *     body: JSON.stringify(data),
 *   });
 */
export function useCsrfToken(): string {
  const [token, setToken] = React.useState('');

  React.useEffect(() => {
    setToken(getCsrfTokenFromCookie());
  }, []);

  return token;
}
