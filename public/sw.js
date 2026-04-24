/**
 * public/sw.js
 * NAWASENA M15 — Service Worker for Web Push notifications
 *
 * Handles:
 * - push events: show notification via self.registration.showNotification()
 * - notificationclick: open URL from notification data
 */

'use strict';

// Install: skip waiting so updates activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate: claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event: display notification
self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    // If not valid JSON, use raw text
    data = { title: 'NAWASENA', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'NAWASENA';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'nawasena-notification',
    data: {
      url: data.url || '/',
    },
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options),
  );
});

// Notification click: open target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if already open at the URL
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
