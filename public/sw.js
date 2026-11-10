// Janta Live Setu PWA Service Worker + Firebase Cloud Messaging Integration
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'janta-live-setu-v7';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-maskable-512.png',
  '/manifest.json',
  '/manifest.webmanifest'
];

// Initialize Firebase App inside Service Worker for background FCM messaging
firebase.initializeApp({
  apiKey: "AIzaSyDtI9b5bIzjUXszKtZU4i0QqFLzpxEHsiM",
  authDomain: "janta-live-setu-8c68b.firebaseapp.com",
  projectId: "janta-live-setu-8c68b",
  storageBucket: "janta-live-setu-8c68b.firebasestorage.app",
  messagingSenderId: "661183221610",
  appId: "1:661183221610:web:c19e4c3afe1d5e75fedf13",
});

const messaging = firebase.messaging();

// Handle FCM Background Messages
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Janta Live Setu';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: payload.notification?.icon || payload.data?.icon || '/pwa-192.png',
    badge: '/pwa-192.png',
    data: {
      url: payload.data?.url || payload.data?.click_action || payload.notification?.click_action || '/',
      type: payload.data?.type
    },
    tag: payload.data?.eventId || undefined
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Fallback Push Event listener
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const payload = event.data.json();
      const title = payload.notification?.title || payload.data?.title || payload.title || 'Janta Live Setu';
      const options = {
        body: payload.notification?.body || payload.data?.body || payload.body || '',
        icon: payload.notification?.icon || payload.data?.icon || payload.icon || '/pwa-192.png',
        badge: '/pwa-192.png',
        data: {
          url: payload.data?.url || payload.data?.click_action || payload.url || '/',
          type: payload.data?.type
        }
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error('[sw.js] Error parsing push payload:', e);
    }
  }
});

// Notification Click Listener - Focus or Open Window and Navigate
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Install Event - cache static assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('[sw.js] Failed to cache static asset during install:', asset, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate Event - clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network-First for HTML/JS/CSS to ensure fresh deployments are served
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = new URL(event.request.url);

  // Navigation / HTML / Document requests -> Network-First with safe SPA fallback
  const isNavigation =
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/' ||
    Boolean(event.request.headers.get('accept')?.includes('text/html'));

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const indexHtml = await caches.match('/index.html');
          if (indexHtml) return indexHtml;
          const root = await caches.match('/');
          if (root) return root;
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Janta Live Setu</title></head><body><div id="root"></div></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Assets (JS/CSS) -> Network-First with Cache Fallback
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response(null, { status: 404, statusText: 'Asset not found' });
        })
    );
    return;
  }

  // Other static assets (images, icons) -> Cache-First with Network Fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          if (event.request.headers.get('accept')?.includes('text/html')) {
            const indexHtml = await caches.match('/index.html');
            if (indexHtml) return indexHtml;
          }
          return new Response(null, { status: 404, statusText: 'Resource unavailable' });
        });
    })
  );
});
