#!/usr/bin/env node
/**
 * Post-build Workbox manifest injection.
 *
 * Run after `expo export --platform web` and after all cp commands.
 * Reads public/sw-template.js, injects precache manifest, writes dist/sw.js.
 *
 * dist/sw.js is generated — do not commit it to git.
 */

import { injectManifest } from 'workbox-build';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const { count, size, warnings } = await injectManifest({
  swSrc: resolve(rootDir, 'public/sw-template.js'),
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
  // Metro produces content-hashed filenames — don't add revision query param
  dontCacheBustURLsMatching: /[0-9a-f]{8,}\./,
  // Pack JSONs and API data go to IndexedDB (not SW Cache API)
  globIgnores: ['packs/**', 'api/**', 'statusz.json', '_redirects', '_headers'],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
});

if (warnings.length > 0) {
  console.warn('Workbox build warnings:', warnings);
}
console.log(`SW: precached ${count} files (${(size / 1024).toFixed(1)} KB total)`);
