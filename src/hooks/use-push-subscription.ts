'use client';

/**
 * src/hooks/use-push-subscription.ts
 * NAWASENA M15 — React hook for managing Web Push subscriptions
 */

import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@/lib/logger';
import { toast } from '@/lib/toast';

const log = createLogger('use-push-subscription');

export interface PushSubscriptionState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription(): PushSubscriptionState {
  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    isSupported ? (typeof Notification !== 'undefined' ? Notification.permission : 'default') : 'unsupported',
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check current subscription state on mount
  useEffect(() => {
    if (!isSupported) return;

    async function checkSubscription() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        log.error('Failed to check push subscription', { err });
      }
    }

    checkSubscription();
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Browser Anda tidak mendukung push notification');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      log.error('VAPID_PUBLIC_KEY not configured');
      toast.error('Konfigurasi push notification belum lengkap');
      return false;
    }

    setIsLoading(true);
    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast.error('Izin notifikasi ditolak');
        return false;
      }

      // Register service worker if not yet registered
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to server
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        toast.apiError(await res.json());
        await subscription.unsubscribe();
        return false;
      }

      setIsSubscribed(true);
      log.info('Push subscription successful');
      toast.success('Notifikasi push berhasil diaktifkan');
      return true;
    } catch (err) {
      log.error('Failed to subscribe to push', { err });
      toast.error('Gagal mengaktifkan notifikasi push');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setIsSubscribed(false);
        return true;
      }

      // Notify server first
      const res = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      if (!res.ok) {
        log.error('Server unsubscribe failed, still unsubscribing locally');
      }

      await subscription.unsubscribe();
      setIsSubscribed(false);
      log.info('Push unsubscription successful');
      toast.success('Notifikasi push berhasil dinonaktifkan');
      return true;
    } catch (err) {
      log.error('Failed to unsubscribe from push', { err });
      toast.error('Gagal menonaktifkan notifikasi push');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
