/**
 * src/components/anon-report/CaptchaWidget.tsx
 * NAWASENA M12 — Client-side captcha widget.
 *
 * Supports Cloudflare Turnstile (primary).
 * Requires @cloudflare/turnstile-nextjs or manual script loading.
 *
 * For now implements a simple div container that loads Turnstile script.
 * Token is returned via onToken callback to the parent form.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact';
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

interface CaptchaWidgetProps {
  onToken: (token: string | null) => void;
  provider?: 'turnstile';
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA'; // test key

export function CaptchaWidget({ onToken, provider = 'turnstile' }: CaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const initTurnstile = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    // Remove existing widget if any
    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => {
        onToken(token);
      },
      'error-callback': () => {
        onToken(null);
      },
      'expired-callback': () => {
        onToken(null);
      },
      theme: 'auto',
      size: 'normal',
    });
  }, [onToken]);

  useEffect(() => {
    if (provider !== 'turnstile') return;

    // Check if Turnstile script is already loaded
    if (window.turnstile) {
      initTurnstile();
      return;
    }

    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => initTurnstile();
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [provider, initTurnstile]);

  return (
    <div>
      <div ref={containerRef} className="cf-turnstile" />
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Verifikasi ini memastikan laporan dikirim oleh manusia, bukan bot.
      </p>
    </div>
  );
}

// Development-only bypass widget for testing
export function CaptchaWidgetDev({ onToken }: { onToken: (token: string | null) => void }) {
  return (
    <div className="rounded-xl border border-dashed border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-950/20">
      <p className="mb-2 text-xs font-semibold text-yellow-700 dark:text-yellow-400">
        Dev Mode: Captcha Bypass
      </p>
      <button
        type="button"
        onClick={() => onToken('test-bypass')}
        className="rounded-lg bg-yellow-400 px-3 py-1 text-xs font-semibold text-yellow-900 hover:bg-yellow-500"
      >
        Simulasi Captcha Berhasil
      </button>
    </div>
  );
}
