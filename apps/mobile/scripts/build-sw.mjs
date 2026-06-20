#!/usr/bin/env node
/**
 * Post-build Workbox SW generation.
 *
 * Run after `expo export --platform web` and after all cp commands.
 * Uses generateSW to produce a self-contained dist/sw.js with the
 * precache manifest and runtime caching bundled in — no template file needed.
 *
 * dist/sw.js is generated — do not commit it to git.
 */

import { generateSW } from 'workbox-build';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const { count, size, warnings } = await generateSW({
  swDest: resolve(rootDir, 'dist/sw.js'),
  globDirectory: resolve(rootDir, 'dist'),
  globPatterns: [
    'index.html',
    '_expo/static/js/web/*.js',
    'icons/*.png',
    'manifest.webmanifest',
    'apple-touch-icon.png',
    'favicon.ico',
  ],
  globIgnores: ['packs/**', 'api/**', 'statusz.json', '_redirects', '_headers'],
  // Metro produces content-hashed filenames — don't add revision query param
  dontCacheBustURLsMatching: /[0-9a-f]{8,}\./,
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  // SPA: serve index.html for all navigation requests
  navigateFallback: '/index.html',
  // Cache ID — bump this to orphan old Workbox caches on all clients
  cacheId: 'tw-v2',
  // Auto-activate new SW and claim open tabs immediately
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      urlPattern: /\/api\/v1\/packs\.json$/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'pack-index-cache' },
    },
  ],
});

if (warnings.length > 0) {
  console.warn('Workbox build warnings:', warnings);
}
console.log(`SW: precached ${count} files (${(size / 1024).toFixed(1)} KB total)`);
