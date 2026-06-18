# Phase 23: Web Pack Downloading - Pattern Map

**Mapped:** 2026-06-18
**Files analyzed:** 10 (2 new, 3 new non-TS, 5 modified)
**Analogs found:** 9 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `services/packCache.ts` | service (platform shim) | request-response | `services/platformStorage.ts` + `.native.ts` | exact — same `.ts` + `.native.ts` shim pattern |
| `services/packCache.web.ts` | service (IDB adapter) | CRUD | `services/packDownloader.ts` | role-match — async storage ops, Zod types |
| `public/sw-template.js` | config (SW source) | event-driven | `public/index.html` (polyfill inline scripts) | partial — same public/ placement, JS-only file |
| `scripts/build-sw.mjs` | utility (build script) | batch | `scripts/generate-statusz.mjs` | exact — ESM post-build Node script, same dir |
| `services/questionProvider.ts` (MOD) | service | request-response | itself | self — replace `webPackCache` Map with IDB call |
| `services/packIndex.ts` (MOD) | service | request-response | itself + `services/packDownloader.ts` | self + role-match — add IDB fallback in catch |
| `stores/packStore.ts` (MOD) | store | CRUD | itself | self — add new action following `downloadPack` pattern |
| `app/packs/index.tsx` (MOD) | component/screen | request-response | itself | self — add web-conditional Download button per row |
| `public/index.html` (MOD) | config | event-driven | itself | self — append SW registration script before `</body>` |
| `apps/mobile/package.json` (MOD) | config | — | itself | self — add three deps |

---

## Pattern Assignments

### `services/packCache.ts` (platform shim, request-response)

**Analog:** `services/platformStorage.ts` (web default) + `services/platformStorage.native.ts` (native override)

The project uses Metro's platform extension system: `foo.native.ts` overrides `foo.ts` on native builds. For `packCache`, the web implementation lives in `packCache.web.ts`. Because Metro does NOT auto-resolve `.web.ts` the same way it resolves `.native.ts`, a runtime `Platform.OS` guard inside `packCache.ts` is required to conditionally require the web module.

**Imports pattern** (`services/platformStorage.ts` lines 1–3, `services/platformStorage.native.ts` lines 1–2):
```typescript
// platformStorage.ts — web default (no imports needed, uses sessionStorage)
export const platformStorage = { ... };

// platformStorage.native.ts — native override
import AsyncStorage from '@react-native-async-storage/async-storage';
export const platformStorage = AsyncStorage;
```

**Platform guard + require pattern** (from RESEARCH.md Pattern 4 — no existing analog uses this exact runtime-require variant, but `questionProvider.ts` lines 128–136 uses `await import('../database')` as the established dynamic import approach for platform isolation):
```typescript
import { Platform } from 'react-native';

const impl = Platform.OS === 'web'
  ? require('./packCache.web')   // synchronous require — idb-keyval is CommonJS-compatible
  : null;

export const getCachedPackQuestions = impl?.getCachedPackQuestions ?? async () => null;
export const setCachedPackQuestions = impl?.setCachedPackQuestions ?? async () => {};
// ... repeat for each export
```

**Key rule:** Never `import { ... } from './packCache.web'` at top level — idb-keyval must not reach the native Metro bundle. Use the `require()` guard pattern above, or fall back to `await import('./packCache.web')` inside a `Platform.OS === 'web'` block (matching `questionProvider.ts` lines 21 and 134–136).

---

### `services/packCache.web.ts` (IDB adapter, CRUD)

**Analog:** `services/packDownloader.ts`

This is the canonical service for fetch + parse + store operations. `packCache.web.ts` replaces the storage target (WatermelonDB → idb-keyval) but follows the same pattern: async functions that accept typed parameters, use `safeParse` for validation, and propagate errors.

**Imports pattern** (`packDownloader.ts` lines 1–4):
```typescript
import { QuestionPackSchema, QuestionPack, PackIndexEntry, Category } from '@trivial-world/types';
import { verifyChecksum } from './checksum';
import { PACK_DOWNLOAD_TIMEOUT_MS } from '../constants/packConfig';
```

For `packCache.web.ts`, replace WatermelonDB imports with idb-keyval:
```typescript
import { get, set, del, keys, createStore } from 'idb-keyval';
import type { Question, PackIndexEntry } from '@trivial-world/types';
```

**Store initialization** (RESEARCH.md Pattern 4, line 279 — avoid default idb-keyval store):
```typescript
// Single named store — avoids collision with idb-keyval defaults on shared localhost
const packStore = createStore('trivial-world-packs', 'pack-cache');
```

**Core CRUD pattern** (`packDownloader.ts` lines 35–165 for structure; the actual IDB API from RESEARCH.md Pattern 4):
```typescript
export async function getCachedPackQuestions(packId: string): Promise<Question[] | null> {
  return (await get<Question[]>(`pack:${packId}`, packStore)) ?? null;
}

export async function setCachedPackQuestions(packId: string, questions: Question[]): Promise<void> {
  await set(`pack:${packId}`, questions, packStore);
}

export async function getOfflinePackIds(): Promise<string[]> {
  const allKeys = await keys(packStore);
  return (allKeys as string[])
    .filter(k => k.startsWith('pack:') && !k.startsWith('pack-checksum:'))
    .map(k => (k as string).replace('pack:', ''));
}

export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    return navigator.storage.persist();
  }
  return false;
}
```

**Error handling:** idb-keyval itself wraps IDB transactions; no explicit try/catch needed in individual getters/setters. The `downloadPackForOffline` action in packStore handles errors at the call site (see packStore section below).

---

### `public/sw-template.js` (SW source, event-driven)

**Analog:** `public/index.html` (polyfill inline scripts, lines 37–251)

No existing SW file in the codebase. The `public/index.html` establishes the pattern for browser-side JavaScript that must run outside the React bundle. The SW template follows a similar structure: plain JavaScript, no TypeScript, no bundler transforms applied directly to the source file.

**Placement:** `apps/mobile/public/sw-template.js` — committed alongside `index.html`, `manifest.webmanifest`. `dist/sw.js` is generated by the build script and must NOT be committed.

**Core SW pattern** (RESEARCH.md Pattern 2 — verified against Workbox docs):
```javascript
// public/sw-template.js
// workbox-build injectManifest will bundle these npm imports + replace self.__WB_MANIFEST
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST);

// SPA: serve /index.html from precache for all navigation requests
const handler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(handler));

// Pack index: stale-while-revalidate (serve cache, refresh in background)
registerRoute(
  ({ url }) => url.pathname === '/api/v1/packs.json',
  new StaleWhileRevalidate({ cacheName: 'pack-index-cache' })
);

// Silent SW update: skip waiting immediately
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
```

**Critical constraint:** `workbox-build injectManifest` handles bundling of the `import` statements in this file. If bundling is skipped or the build script is not run, the SW will fail to register with "The script has an unsyntactic import declaration."

---

### `scripts/build-sw.mjs` (post-build Node script, batch)

**Analog:** `scripts/generate-statusz.mjs` (lines 1–101)

This is the direct pattern. Both are ES module (`.mjs`) post-build Node scripts in `apps/mobile/scripts/`. Both run as the final step of the `"build"` script in `package.json`.

**File structure pattern** (`scripts/generate-statusz.mjs` lines 1–17):
```javascript
#!/usr/bin/env node
/**
 * [Description of what this script does]
 *
 * Run after `expo export`. [Context]
 */

import { ... } from 'node:...' or 'some-package';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
```

**Core build script pattern** (RESEARCH.md Pattern 1, lines 189–213):
```javascript
import { injectManifest } from 'workbox-build';

const { count, size, warnings } = await injectManifest({
  swSrc: './public/sw-template.js',
  swDest: './dist/sw.js',
  globDirectory: './dist',
  globPatterns: [
    'index.html',
    '_expo/static/js/web/*.js',
    'icons/*.png',
    'manifest.webmanifest',
    'apple-touch-icon.png',
    'favicon.ico',
  ],
  dontCacheBustURLsMatching: /[0-9a-f]{8,}\./,  // Metro already content-hashes filenames
  globIgnores: ['packs/**', 'api/**', 'statusz.json', '_redirects', '_headers'],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
});

if (warnings.length > 0) console.warn('Workbox warnings:', warnings);
console.log(`SW: precached ${count} files (${(size/1024).toFixed(1)}KB)`);
```

**Build script integration** (`package.json` `"build"` key, current value line 10):
```
"build": "expo export --platform web && cp ... && node scripts/generate-statusz.mjs"
```
Append `&& node scripts/build-sw.mjs` as the LAST step — after all `cp` commands and after `generate-statusz.mjs`.

---

### `services/questionProvider.ts` (MOD — web path update)

**Analog:** itself (lines 10–28 — `fetchWebPackQuestions`)

The existing function already has the right shape. Replace the in-memory `webPackCache` Map with IDB calls.

**Current pattern to replace** (lines 8–28):
```typescript
// BEFORE — in-memory cache (wiped on reload)
const webPackCache = new Map<string, Question[]>();

async function fetchWebPackQuestions(packId: string): Promise<Question[] | null> {
  if (webPackCache.has(packId)) return webPackCache.get(packId)!;
  // ... fetch ...
  webPackCache.set(packId, result.data.questions);
  return result.data.questions;
}
```

**New pattern** (RESEARCH.md Pattern 5, lines 355–378):
```typescript
// AFTER — IDB-first, survives page reload
import { getCachedPackQuestions, setCachedPackQuestions } from './packCache';

async function fetchWebPackQuestions(packId: string): Promise<Question[] | null> {
  // 1. Check IDB cache (persists across reloads)
  const cached = await getCachedPackQuestions(packId);
  if (cached) return cached;

  // 2. Try network (existing fetch logic unchanged)
  const { usePackStore } = await import('../stores/packStore');
  const packEntry = usePackStore.getState().availablePacks.find(p => p.id === packId);
  if (!packEntry) return null;

  try {
    const res = await fetch(packEntry.downloadUrl);
    if (!res.ok) return null;
    const { QuestionPackSchema } = await import('@trivial-world/types');
    const result = QuestionPackSchema.safeParse(await res.json());
    if (!result.success) return null;
    // Store in IDB (replaces webPackCache.set)
    await setCachedPackQuestions(packId, result.data.questions);
    return result.data.questions;
  } catch {
    return null;  // offline + no IDB cache → caller falls back to ALL_QUESTIONS
  }
}
```

Delete the `const webPackCache = new Map<...>()` line (line 8). The fallback to `ALL_QUESTIONS` in `getNextQuestionFromBundle` (lines 98–101) already handles the `null` return.

---

### `services/packIndex.ts` (MOD — IDB offline fallback)

**Analog:** itself + `services/packDownloader.ts` (error handling pattern, lines 159–165)

**Current pattern to extend** (`packIndex.ts` lines 24–65):
```typescript
export async function fetchPackIndex(): Promise<PackIndexEntry[]> {
  try {
    const response = await fetch(GENERATOR_PACK_INDEX_URL, { ... });
    // ... validate ...
    return validPacks;
  } catch (error) {
    console.error('Error fetching pack index:', error);
    throw error;  // ← replace this throw with IDB fallback
  }
}
```

**New catch block pattern** (RESEARCH.md Pattern 7, lines 444–467):
```typescript
  } catch (error) {
    // Offline fallback: serve IDB-cached index (web only — noop shim on native)
    if (Platform.OS === 'web') {
      const { getCachedPackIndex } = await import('./packCache.web');
      const cached = await getCachedPackIndex();
      if (cached) return cached;
    }
    console.error('Error fetching pack index:', error);
    throw error;
  }
```

Also add IDB write after successful fetch (inside the existing try block, after `validPacks` is assembled):
```typescript
    // Cache to IDB for offline use (web only)
    if (Platform.OS === 'web') {
      const { setCachedPackIndex } = await import('./packCache.web');
      await setCachedPackIndex(validPacks);
    }
    return validPacks;
```

**Import addition** (line 1):
```typescript
import { Platform } from 'react-native';
```

---

### `stores/packStore.ts` (MOD — new action + state fields)

**Analog:** itself — the existing `downloadPack` action (lines 82–107) is the exact pattern to follow.

**State fields to add** (after `downloadError: string | null` on line 37):
```typescript
// Web-only: IDs of packs cached in IndexedDB (separate from native downloadedPackIds)
offlinePackIds: string[];
```

**Action to add** (following `downloadPack` action shape, lines 82–107):

The `downloadPack` action sets `isDownloading`, calls an async service, updates progress via callback, then refreshes IDs. The new `downloadPackForOffline` action follows the same skeleton but uses `fetch` + streaming + idb-keyval instead of `downloadPackWithProgress`.

**Existing action structure to copy** (`packStore.ts` lines 82–107):
```typescript
downloadPack: async (entry: PackIndexEntry) => {
  set({ isDownloading: true, downloadProgress: 0, downloadBytesWritten: 0, downloadError: null });
  try {
    await downloadPackWithProgress(entry, (progress) => {
      set({ downloadProgress: progress.percent, downloadBytesWritten: progress.bytesWritten });
    });
    const downloadedIds = await getDownloadedPackIds();
    set({ downloadedPackIds: downloadedIds, isDownloading: false, downloadProgress: 100 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Download failed';
    set({ isDownloading: false, downloadProgress: 0, downloadBytesWritten: 0, downloadError: errorMessage });
    throw error;
  }
},
```

**New action pattern** (RESEARCH.md Pattern 6, lines 384–438 — uses ReadableStream reader pattern from `packDownloader.ts` lines 64–86):
```typescript
downloadPackForOffline: async (entry: PackIndexEntry) => {
  set({ isDownloading: true, downloadProgress: 0, downloadBytesWritten: 0, downloadError: null });
  try {
    const { getCachedPackChecksum, setCachedPackQuestions, setCachedPackChecksum,
            getOfflinePackIds, requestPersistentStorage } = await import('../services/packCache.web');

    // Skip re-download if checksum unchanged
    const storedChecksum = await getCachedPackChecksum(entry.id);
    if (storedChecksum === entry.checksum) {
      set({ isDownloading: false, downloadProgress: 100 });
      return;
    }

    // Streaming fetch with inline progress (same reader loop as packDownloader.ts lines 64–86)
    const res = await fetch(entry.downloadUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body!.getReader();
    const chunks: Uint8Array[] = [];
    let bytesWritten = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      bytesWritten += value.length;
      set({
        downloadBytesWritten: bytesWritten,
        downloadProgress: entry.size > 0 ? Math.round((bytesWritten / entry.size) * 100) : 0,
      });
    }

    // Parse + validate (same pattern as packDownloader.ts lines 91–115)
    const text = new TextDecoder().decode(
      chunks.reduce((acc, c) => { const r = new Uint8Array(acc.length + c.length); r.set(acc); r.set(c, acc.length); return r; }, new Uint8Array(0))
    );
    const { QuestionPackSchema } = await import('@trivial-world/types');
    const result = QuestionPackSchema.safeParse(JSON.parse(text));
    if (!result.success) throw new Error('Pack validation failed');

    // Store in IDB
    await setCachedPackQuestions(entry.id, result.data.questions);
    await setCachedPackChecksum(entry.id, entry.checksum);
    await requestPersistentStorage();

    const offlineIds = await getOfflinePackIds();
    set({ offlinePackIds: offlineIds, isDownloading: false, downloadProgress: 100 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Download failed';
    set({ isDownloading: false, downloadProgress: 0, downloadBytesWritten: 0, downloadError: errorMessage });
    throw error;
  }
},
```

**Persist partialize** — add `offlinePackIds` to the `partialize` object (lines 171–179) so the list survives app reload on web.

**fetchAvailablePacks** — extend the action to populate `offlinePackIds` on web by calling `getOfflinePackIds()` after fetching, mirroring the `refreshDownloadedPacks` pattern for native (lines 109–113).

---

### `app/packs/index.tsx` (MOD — Download button + Downloaded badge per row)

**Analog:** itself — existing `downloadPack` / `isDownloading` / `DownloadProgress` component integration (lines 1–48, 138–149, 273–280).

**New state to destructure from packStore** (lines 27–48 pattern):
```typescript
const {
  offlinePackIds,         // web-only IDB offline pack IDs
  downloadPackForOffline, // web-only download action
  // ... existing ...
} = usePackStore();
```

**Conditional Download button per row** — the existing `PackCard` `onPress` handler switches between `togglePackSelection` (downloaded) and `handlePackPress` (not downloaded). For web, add a parallel path that shows a "Download" button for non-offline packs. Follow the existing Platform guard pattern (lines 90–93, 312):
```typescript
const isOfflineOnWeb = Platform.OS === 'web' && offlinePackIds.includes(item.id);
```

**Download button trigger pattern** (mirrors `handleDownload` lines 138–149):
```typescript
const handleDownloadForOffline = async (pack: PackIndexEntry) => {
  errorPackRef.current = pack;
  try {
    await downloadPackForOffline(pack);
  } catch (error) {
    console.error('Offline download failed:', error);
  }
};
```

**Progress display** — reuse existing `<DownloadProgress>` component (lines 275–280). The `isDownloading`, `downloadProgress`, and `downloadBytesWritten` state fields are already in the store; no new progress state needed.

**Downloaded badge** — add inline badge text "Downloaded" adjacent to the pack name when `offlinePackIds.includes(item.id)` on web. Follow existing badge pattern from `PackCard` for the "Update Available" indicator.

---

### `public/index.html` (MOD — SW registration)

**Analog:** itself — the existing polyfill `<script>` blocks (lines 36–251) establish the pattern for inline scripts in this file.

**Placement rule** (RESEARCH.md Pattern 3, lines 253–264; RESEARCH.md anti-patterns): The SW registration script MUST be appended at the END of `<body>`, after `</div>` (currently line 261) but before `</body>` (line 262). This ensures all polyfills in `<head>` have already run.

**Pattern to append** (RESEARCH.md Pattern 3):
```html
<script type="module">
  import { Workbox } from 'https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-window.prod.mjs';
  if ('serviceWorker' in navigator) {
    const wb = new Workbox('/sw.js');
    wb.addEventListener('waiting', () => wb.messageSkipWaiting());
    wb.addEventListener('controlling', () => window.location.reload());
    wb.register();
  }
</script>
```

**Why `type="module"`:** The CDN URL is a native ES module; `type="module"` defers execution automatically and allows `import`. This script runs after the polyfills in `<head>` and after DOM content is loaded, which is the correct ordering.

---

### `apps/mobile/package.json` (MOD — add dependencies)

**Analog:** itself — existing `"dependencies"` and `"devDependencies"` sections.

**Additions required** (RESEARCH.md Environment Availability table, lines 688–701):
```json
"dependencies": {
  "idb-keyval": "6.2.5",
  "workbox-window": "7.4.1"
},
"devDependencies": {
  "workbox-build": "7.4.1"
}
```

The SW template imports `workbox-precaching`, `workbox-routing`, and `workbox-strategies` — these are bundled by `workbox-build` at build time, not required as explicit package.json entries if `workbox-build` transitively provides them. Verify after install.

---

## Shared Patterns

### Platform Guard (dynamic import)
**Source:** `services/questionProvider.ts` lines 129–136 and `services/packDownloader.ts` lines 39–40
**Apply to:** `services/packCache.ts` shim, `services/packIndex.ts` IDB calls, `stores/packStore.ts` `downloadPackForOffline`
```typescript
// Dynamic import prevents bundling native/web-only modules on the wrong platform
const { getDatabase } = await import('../database');         // native-only
const { getCachedPackIndex } = await import('./packCache.web');  // web-only
```

### ReadableStream Chunk Accumulator
**Source:** `services/packDownloader.ts` lines 63–98
**Apply to:** `stores/packStore.ts` `downloadPackForOffline` action
```typescript
const reader = response.body?.getReader();
const chunks: Uint8Array[] = [];
let bytesWritten = 0;
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
  bytesWritten += value.length;
  // report progress...
}
const content = new TextDecoder().decode(
  chunks.reduce((acc, chunk) => {
    const result = new Uint8Array(acc.length + chunk.length);
    result.set(acc); result.set(chunk, acc.length);
    return result;
  }, new Uint8Array(0))
);
```

### Zustand Action Error Pattern
**Source:** `stores/packStore.ts` `downloadPack` action lines 82–107
**Apply to:** `downloadPackForOffline` new action
```typescript
set({ isDownloading: true, downloadProgress: 0, downloadBytesWritten: 0, downloadError: null });
try {
  // ... async work ...
  set({ isDownloading: false, downloadProgress: 100 });
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Download failed';
  set({ isDownloading: false, downloadProgress: 0, downloadBytesWritten: 0, downloadError: errorMessage });
  throw error;
}
```

### Zod safeParse + dynamic import
**Source:** `services/questionProvider.ts` lines 20–23, `services/packDownloader.ts` lines 111–115
**Apply to:** `downloadPackForOffline`, `packCache.web.ts`
```typescript
const { QuestionPackSchema } = await import('@trivial-world/types');
const result = QuestionPackSchema.safeParse(json);
if (!result.success) return null;  // or throw, depending on context
```

### Post-Build ESM Script Structure
**Source:** `scripts/generate-statusz.mjs` lines 1–17
**Apply to:** `scripts/build-sw.mjs`
```javascript
#!/usr/bin/env node
import { ... } from 'some-package';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `public/sw-template.js` | config (SW) | event-driven | No service worker exists in the codebase; closest analog is `public/index.html` polyfill scripts for placement, but SW internals are novel |

---

## Metadata

**Analog search scope:** `apps/mobile/services/`, `apps/mobile/stores/`, `apps/mobile/app/packs/`, `apps/mobile/public/`, `apps/mobile/scripts/`
**Files read:** 11
**Pattern extraction date:** 2026-06-18
