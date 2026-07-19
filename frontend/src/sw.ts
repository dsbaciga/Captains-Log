/// <reference lib="webworker" />
/**
 * Custom service worker (injectManifest strategy).
 *
 * Re-creates the exact behavior of the previous generateSW configuration
 * (precaching, SPA navigation fallback, runtime caching with the SAME cache
 * names/limits so existing user caches keep working) and adds Web Push
 * notification handling, which generateSW cannot provide.
 */
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import type { PrecacheEntry } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

// --- Precaching (equivalent to generateSW globPatterns output) ---
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// registerType: 'autoUpdate' semantics - activate new SW versions immediately
self.skipWaiting();
clientsClaim();

// --- SPA navigation fallback ---
// Serve index.html for all navigation requests so React Router handles
// client-side routing correctly (same denylist as before).
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//, /^\/offline\.html$/],
  })
);

// --- Runtime caching (translated 1:1 from the previous workbox.runtimeCaching) ---

// API responses - Network first, fallback to cache
registerRoute(
  /^.*\/api\/(trips|locations|activities|transportation|lodging|journals|photos|albums)/,
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      }),
    ],
  })
);

// Photo thumbnails - Cache first for fast loading
registerRoute(
  /^.*\/uploads\/.*\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i,
  new CacheFirst({
    cacheName: 'photo-thumbnails',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Map tiles - Cache first with long expiration
registerRoute(
  /^https:\/\/.*tile.*\.(openstreetmap|osm|maptiler|mapbox|stamen).*\.(png|jpg|jpeg|webp)$/i,
  new CacheFirst({
    cacheName: 'map-tiles',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 1000,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Alternative pattern for map tiles (covers more tile servers)
registerRoute(
  /^https:\/\/[a-c]\.tile\.openstreetmap\.org\//,
  new CacheFirst({
    cacheName: 'map-tiles',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 1000,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Nominatim geocoding - Cache first since location data rarely changes
registerRoute(
  /^.*nominatim.*\/(search|reverse)/i,
  new CacheFirst({
    cacheName: 'geocoding-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
      }),
    ],
  })
);

// Google Fonts - Cache first
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
);

// --- Web Push notifications ---

interface PushNotificationData {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushNotificationData = {};
  if (event.data) {
    try {
      payload = event.data.json() as PushNotificationData;
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'Travel Life';
  const options: NotificationOptions = {
    body: payload.body || '',
    data: { url: payload.url || '/' },
    tag: payload.tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  const url = data?.url || '/';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Focus an existing window and navigate it to the target URL
      for (const client of clientList) {
        await client.focus();
        if (new URL(client.url).pathname !== url) {
          try {
            await client.navigate(url);
          } catch {
            // Some browsers disallow navigate() from the SW; the app is focused anyway
          }
        }
        return;
      }

      await self.clients.openWindow(url);
    })()
  );
});
