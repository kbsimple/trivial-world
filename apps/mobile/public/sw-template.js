/**
 * Workbox Service Worker template.
 * DO NOT import from the React app — this is a browser SW context.
 *
 * workbox-build injectManifest replaces self.__WB_MANIFEST with the precache
 * manifest and bundles the npm imports into dist/sw.js during the build step.
 */
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

// Precache app shell (manifest injected by workbox-build injectManifest)
precacheAndRoute(self.__WB_MANIFEST);

// SPA: serve /index.html from precache for all navigation requests
const handler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(handler));

// Pack index: stale-while-revalidate — serve cached, update in background
registerRoute(
  ({ url }) => url.pathname === '/api/v1/packs.json',
  new StaleWhileRevalidate({ cacheName: 'pack-index-cache' })
);

// Silent SW update: skip waiting immediately when new SW installs
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
