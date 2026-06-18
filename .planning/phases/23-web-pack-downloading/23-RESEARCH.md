# Phase 23: Web Pack Downloading - Research

**Researched:** 2026-06-18
**Domain:** Service Worker (Workbox), IndexedDB (idb-keyval), Expo Metro web export
**Confidence:** HIGH

## Summary

Phase 23 adds offline capability to the web app by layering three mechanisms: a Workbox service worker precaches the app shell and applies stale-while-revalidate to the pack index, idb-keyval provides durable IndexedDB storage for downloaded pack bodies (surviving page reloads and eviction pressure), and `navigator.storage.persist()` requests persistent storage quota on first download.

The Expo SDK 56 / Metro web export pipeline does not integrate with Workbox natively. The correct approach is a **post-build script** (`scripts/build-sw.mjs`) that runs `workbox-build injectManifest` against the `dist/` directory after `expo export --platform web`. The generated `dist/sw.js` is registered from an inline script in `public/index.html` using the `workbox-window` `Workbox` class before the app bundle loads.

The existing `if (Platform.OS === 'web')` guard pattern throughout the codebase is the right model for protecting idb-keyval imports. Because vitest's react-native mock sets `Platform.OS = 'ios'`, web-only IDB tests must import `services/packCache.web.ts` directly and mock `idb-keyval` with `vi.mock()`. The `fake-indexeddb` package is available (`npm view` confirmed v6.2.5) but not strictly needed since `vi.mock('idb-keyval', ...)` is simpler.

**Primary recommendation:** Use `workbox-build injectManifest` as a post-build Node script, `idb-keyval` with a single `createStore('trivial-world-packs', 'pack-cache')`, Platform-guarded dynamic import, and `workbox-window` registration in `public/index.html`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Service Worker Implementation**
- Use Workbox (workbox-window + workbox-sw via CDN or npm) — handles SW lifecycle, retry logic, precache manifest
- Register SW in `public/index.html` inline script (loads before app bundle, no RN dependency)
- SW update strategy: silent background update + reload on next navigation (no banner)

**IndexedDB Storage Design**
- Use `idb-keyval` (~1KB gzipped, zero-config key-value wrapper)
- Store parsed `Question[]` arrays keyed by packId (parse once on download, fast reads)
- Cache key scheme: `pack:{packId}` with separate `pack-checksum:{packId}` entry for update detection
- Also cache pack index (available packs list) in IndexedDB to show pack list when offline

**Download Trigger & User Feedback**
- Explicit "Download for offline" button per pack in the pack list (not auto-download)
- Progress feedback: inline spinner + byte counter in pack list row while downloading
- Status badge: "Downloaded ✓" text badge on pack rows that are cached in IndexedDB
- Offline graceful degradation: when offline and no IndexedDB cache, fall back to bundled default questions (don't crash)

### Claude's Discretion
- Exact Workbox version and integration method (CDN vs npm install)
- Whether to update PROJECT.md Out of Scope section (should remove SW + IndexedDB from that list)
- Service worker file naming and placement in `public/`
- idb-keyval store initialization (single store vs per-type stores)

### Deferred Ideas (OUT OF SCOPE)
- Auto-download all packs in background on first visit (bandwidth concern, deferred to user decision)
- "Update available" banner for SW updates (deferred — silent reload chosen)
- Offline indicator in app header/navbar (out of scope for this phase)
- Per-player offline pack management (complexity deferred)
</user_constraints>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| App shell offline caching | Browser (Service Worker) | — | SW intercepts navigation and asset requests; app shell precached at install time |
| Pack body durable storage | Browser (IndexedDB) | — | IndexedDB is eviction-resistant when persist() granted; SW Cache API can be evicted |
| Pack index offline fallback | Browser (IndexedDB) | Browser (SW Cache) | User decision: IndexedDB not Cache API for pack bodies; index follows same pattern |
| Download progress UI | Frontend (React) | packStore (Zustand) | Progress state in packStore, rendered in packs/index.tsx |
| Checksum-based invalidation | Service (packCache.web.ts) | — | Compare stored `pack-checksum:{packId}` vs fetched index checksum before re-download |
| SW registration | Browser (index.html inline script) | — | Must run before app bundle to avoid RN polyfill conflicts (see polyfill layer in index.html) |
| SW precache manifest injection | Build step (Node script) | — | Metro doesn't integrate with Workbox; post-build injectManifest fills `self.__WB_MANIFEST` |
| Persistent storage quota | Browser (navigator.storage) | — | Call `.persist()` once on first download; Safari 17+ grants silently without prompt |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| idb-keyval | 6.2.5 | IndexedDB key-value store | ~1KB gzipped, zero-config, Promise-based, authored by Jake Archibald (Google) |
| workbox-build | 7.4.1 | Post-build precache manifest injection | Google's official Workbox build tool; `injectManifest` gives full SW control |
| workbox-window | 7.4.1 | SW registration + lifecycle from main thread | Handles `waiting`/`controlling` events; cleanly wraps `navigator.serviceWorker.register()` |

### Supporting (SW internals — imported inside `public/sw-template.js`)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| workbox-precaching | 7.4.1 | Precache app shell JS/HTML/assets | Used inside SW file only; fills `self.__WB_MANIFEST` |
| workbox-routing | 7.4.1 | Route-based strategy dispatch in SW | Used inside SW file only; NavigationRoute for SPA index.html |
| workbox-strategies | 7.4.1 | StaleWhileRevalidate for pack index | Used inside SW file; serves `api/v1/packs.json` from cache first |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| workbox-build (npm) | workbox-cli generateSW | generateSW auto-generates the SW — less control; injectManifest lets us write the SW file |
| idb-keyval | idb (full library) | idb adds ~4KB for advanced cursor/index support we don't need; keyval is sufficient |
| idb-keyval | Cache API | Cache API can be evicted by browser under storage pressure; IndexedDB with persist() is durable |
| fake-indexeddb (tests) | vi.mock('idb-keyval') | Either works; vi.mock is simpler for unit tests that don't test IDB internals |

**Installation (add to `apps/mobile/package.json`):**
```bash
cd apps/mobile
pnpm add idb-keyval workbox-window
pnpm add -D workbox-build
```

**Version verification:** [VERIFIED: npm registry — idb-keyval 6.2.5 (2026-06-02), workbox-build 7.4.1, workbox-window 7.4.1]

---

## Architecture Patterns

### System Architecture Diagram

```
User presses "Download for offline"
  │
  ▼
packStore.downloadPackForOffline(entry)
  │
  ├─ fetch(entry.downloadUrl)           [network]
  │      │
  │      ▼
  │   QuestionPackSchema.safeParse(json)
  │      │
  │      ▼
  │   packCache.web.ts
  │      ├─ set('pack:{packId}', Question[])
  │      └─ set('pack-checksum:{packId}', checksum)
  │
  └─ set('pack-index', PackIndexEntry[])  [sync index to IDB]

─────── offline load ────────────────────────────────────

navigator offline OR network error
  │
  ▼
fetchWebPackQuestions(packId)           [questionProvider.ts web path]
  │
  ├─ get('pack:{packId}') from IDB      [HIT → return cached Question[]]
  └─ fetch(downloadUrl)                 [MISS + online → fetch + store]
       └─ MISS + offline → return null → fall back to ALL_QUESTIONS

─────── pack index offline ──────────────────────────────

fetchAvailablePacks() in packStore
  │
  ├─ fetchPackIndex()                   [network attempt]
  │       │
  │       ├─ success → set availablePacks + update IDB 'pack-index'
  │       └─ failure (offline) → get('pack-index') from IDB → set availablePacks

─────── service worker layer ────────────────────────────

Browser navigation request
  │
  ▼
SW NavigationRoute → precached /index.html (app shell)

/_expo/static/js/web/*.js
  └─ SW CacheFirst (already-hashed filenames, never expire)

/api/v1/packs.json
  └─ SW StaleWhileRevalidate (serve cache, update in background)

/packs/*.json
  └─ SW excludes (handled by IndexedDB, not SW Cache API)
```

### Recommended File Structure (new files only)

```
apps/mobile/
├── public/
│   └── sw-template.js          # SW source (injectManifest reads this)
├── scripts/
│   └── build-sw.mjs            # Post-build: workbox-build injectManifest
└── services/
    ├── packCache.web.ts         # idb-keyval operations (web only)
    └── packCache.ts             # Platform guard + dynamic import shim
```

`dist/sw.js` is generated by `build-sw.mjs` — never committed to git.

### Pattern 1: Post-Build SW Injection (workbox-build injectManifest)

**What:** After `expo export --platform web` produces `dist/`, run a Node script that injects a precache manifest into the SW template and writes `dist/sw.js`.

**When to use:** Expo Metro web export (no webpack integration). Runs as the final step in the build script.

```javascript
// scripts/build-sw.mjs
// Source: https://developer.chrome.com/docs/workbox/modules/workbox-build
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
  // Metro produces content-hashed filenames — don't add revision query param
  dontCacheBustURLsMatching: /[0-9a-f]{8,}\./,
  // Exclude large pack JSONs (handled by idb-keyval, not SW cache)
  globIgnores: ['packs/**', 'api/**', 'statusz.json', '_redirects', '_headers'],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB for entry bundle
});

if (warnings.length > 0) console.warn('Workbox warnings:', warnings);
console.log(`SW: precached ${count} files (${(size/1024).toFixed(1)}KB)`);
```

**Build script update** (`package.json`):
```
"build": "expo export --platform web && [existing cp commands] && node scripts/build-sw.mjs"
```

### Pattern 2: SW Template (sw-template.js)

```javascript
// public/sw-template.js
// Source: [CITED: https://developer.chrome.com/docs/workbox/modules/workbox-precaching]
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

// Precache app shell (replaced by injectManifest)
precacheAndRoute(self.__WB_MANIFEST);

// SPA: all navigation requests serve /index.html from precache
const handler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(handler));

// Pack index: stale-while-revalidate (serve cached, refresh in background)
registerRoute(
  ({ url }) => url.pathname === '/api/v1/packs.json',
  new StaleWhileRevalidate({ cacheName: 'pack-index-cache' })
);

// Silent SW update: skip waiting immediately when new SW installs
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
```

**Note:** `sw-template.js` uses ES module imports but SW files require bundling. With `workbox-build` `injectManifest`, the bundling happens automatically — set `swSrc` to the template and `workbox-build` handles the rest. [VERIFIED: Context7 /googlechrome/workbox]

### Pattern 3: SW Registration (public/index.html)

```html
<!-- Placed immediately before </body>, after polyfill scripts -->
<script type="module">
  import { Workbox } from 'https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-window.prod.mjs';
  if ('serviceWorker' in navigator) {
    const wb = new Workbox('/sw.js');
    // Silent update: when SW is waiting, skip waiting immediately
    wb.addEventListener('waiting', () => wb.messageSkipWaiting());
    // Reload on controlling to get new cached assets
    wb.addEventListener('controlling', () => window.location.reload());
    wb.register();
  }
</script>
```

**Alternative (npm import, smaller at build time):** Import `workbox-window` from the npm package installed in `package.json`. Given the inline script must run before the app bundle and the polyfill layer, the CDN approach is simpler here and avoids Metro bundling workbox-window into the main bundle. [ASSUMED: CDN vs npm tradeoff for this specific registration context]

**Critical constraint:** The SW registration script must NOT conflict with the existing polyfill scripts in `index.html`. The polyfills lock `window.fetch`, `window.performance`, and `window.setImmediate` before the app bundle runs. The SW registration script should appear at the END of `<body>` (as shown above), after all polyfill scripts, to avoid ordering conflicts.

### Pattern 4: idb-keyval Pack Cache Service

```typescript
// services/packCache.web.ts
// Source: [CITED: https://github.com/jakearchibald/idb-keyval]
import { get, set, del, keys, createStore } from 'idb-keyval';
import { Question, PackIndexEntry } from '@trivial-world/types';

// Single store for all pack data: keys are 'pack:{id}', 'pack-checksum:{id}', 'pack-index'
const packStore = createStore('trivial-world-packs', 'pack-cache');

export async function getCachedPackQuestions(packId: string): Promise<Question[] | null> {
  return (await get<Question[]>(`pack:${packId}`, packStore)) ?? null;
}

export async function setCachedPackQuestions(packId: string, questions: Question[]): Promise<void> {
  await set(`pack:${packId}`, questions, packStore);
}

export async function getCachedPackChecksum(packId: string): Promise<string | null> {
  return (await get<string>(`pack-checksum:${packId}`, packStore)) ?? null;
}

export async function setCachedPackChecksum(packId: string, checksum: string): Promise<void> {
  await set(`pack-checksum:${packId}`, checksum, packStore);
}

export async function getCachedPackIndex(): Promise<PackIndexEntry[] | null> {
  return (await get<PackIndexEntry[]>('pack-index', packStore)) ?? null;
}

export async function setCachedPackIndex(packs: PackIndexEntry[]): Promise<void> {
  await set('pack-index', packs, packStore);
}

export async function getOfflinePackIds(): Promise<string[]> {
  const allKeys = await keys(packStore);
  return (allKeys as string[])
    .filter(k => k.startsWith('pack:') && !k.startsWith('pack-checksum:'))
    .map(k => (k as string).replace('pack:', ''));
}

export async function deleteCachedPack(packId: string): Promise<void> {
  await del(`pack:${packId}`, packStore);
  await del(`pack-checksum:${packId}`, packStore);
}

export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    return navigator.storage.persist();
  }
  return false;
}
```

```typescript
// services/packCache.ts  — Platform guard shim
// [ASSUMED: dynamic import pattern; alternative is Platform.OS === 'web' + require()]
import { Platform } from 'react-native';
import type { Question, PackIndexEntry } from '@trivial-world/types';

// Noop stubs for native (WatermelonDB handles native caching)
const noop = async () => null;
const noopVoid = async () => {};

const impl = Platform.OS === 'web'
  ? require('./packCache.web')  // synchronous require avoids async init at module level
  : null;

export const getCachedPackQuestions = impl?.getCachedPackQuestions ?? noop;
export const setCachedPackQuestions = impl?.setCachedPackQuestions ?? noopVoid;
export const getCachedPackChecksum  = impl?.getCachedPackChecksum  ?? noop;
export const setCachedPackChecksum  = impl?.setCachedPackChecksum  ?? noopVoid;
export const getCachedPackIndex     = impl?.getCachedPackIndex     ?? noop;
export const setCachedPackIndex     = impl?.setCachedPackIndex     ?? noopVoid;
export const getOfflinePackIds      = impl?.getOfflinePackIds      ?? (async () => []);
export const deleteCachedPack       = impl?.deleteCachedPack       ?? noopVoid;
export const requestPersistentStorage = impl?.requestPersistentStorage ?? (async () => false);
```

**Note:** `require()` inside a Platform guard is evaluated at module load time, not at call time. Since idb-keyval ships `./dist/compat.cjs` as its `main` (CommonJS), Metro can consume it. The web bundle will include idb-keyval; the native bundle will not (the `null` branch is tree-shaken by Metro). [VERIFIED: idb-keyval package.json exports — main: './dist/compat.cjs', module: './dist/compat.js']

### Pattern 5: questionProvider.ts Web Path Update

```typescript
// In fetchWebPackQuestions() — replace webPackCache with IDB-first lookup
async function fetchWebPackQuestions(packId: string): Promise<Question[] | null> {
  // 1. Check IDB cache first (persists across reloads)
  const cached = await getCachedPackQuestions(packId);
  if (cached) return cached;

  // 2. Try network
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
    return null; // offline + no cache → caller falls back to ALL_QUESTIONS
  }
}
```

### Pattern 6: packStore.ts downloadPackForOffline Action

```typescript
// New action in packStore — web-only offline download
downloadPackForOffline: async (entry: PackIndexEntry) => {
  set({ isDownloading: true, downloadProgress: 0, downloadBytesWritten: 0, downloadError: null });
  try {
    // Check if already cached with same checksum
    const storedChecksum = await getCachedPackChecksum(entry.id);
    if (storedChecksum === entry.checksum) {
      // Already up to date
      set({ isDownloading: false, downloadProgress: 100 });
      return;
    }

    // Fetch pack body with progress tracking
    const res = await fetch(entry.downloadUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Stream with progress reporting
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

    // Parse and validate
    const text = new TextDecoder().decode(
      chunks.reduce((acc, c) => { const r = new Uint8Array(acc.length + c.length); r.set(acc); r.set(c, acc.length); return r; }, new Uint8Array(0))
    );
    const { QuestionPackSchema } = await import('@trivial-world/types');
    const result = QuestionPackSchema.safeParse(JSON.parse(text));
    if (!result.success) throw new Error('Pack validation failed');

    // Store in IDB
    await setCachedPackQuestions(entry.id, result.data.questions);
    await setCachedPackChecksum(entry.id, entry.checksum);

    // Request persistent storage on first download
    await requestPersistentStorage();

    // Refresh offline pack IDs in store
    const offlineIds = await getOfflinePackIds();
    set({ downloadedPackIds: offlineIds, isDownloading: false, downloadProgress: 100 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Download failed';
    set({ isDownloading: false, downloadProgress: 0, downloadBytesWritten: 0, downloadError: errorMessage });
    throw error;
  }
},
```

### Pattern 7: packIndex.ts Offline Fallback

```typescript
// In fetchPackIndex() — add IDB fallback on network failure
export async function fetchPackIndex(): Promise<PackIndexEntry[]> {
  try {
    const response = await fetch(GENERATOR_PACK_INDEX_URL, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!response.ok) throw new Error(`${response.status}`);
    const data: PackIndexResponse = await response.json();
    // ... existing Zod validation ...

    // Cache to IDB for offline use (web only — noop on native)
    if (Platform.OS === 'web') {
      const { setCachedPackIndex } = await import('./packCache.web');
      await setCachedPackIndex(validPacks);
    }
    return validPacks;
  } catch (error) {
    // Offline fallback: serve IDB-cached index
    if (Platform.OS === 'web') {
      const { getCachedPackIndex } = await import('./packCache.web');
      const cached = await getCachedPackIndex();
      if (cached) return cached;
    }
    throw error;
  }
}
```

### Anti-Patterns to Avoid

- **Precaching pack body JSONs in SW:** Pack bodies are 30KB each × 19 packs = ~570KB. The SW precache is for the app shell only. Pack bodies are explicitly downloaded to IndexedDB on user demand.
- **Using Cache API for pack bodies:** Cache API storage can be evicted by the browser under storage pressure. IndexedDB with `navigator.storage.persist()` is durable. [CITED: https://webkit.org/blog/14403/updates-to-storage-policy/]
- **Registering SW inside the React app:** The existing `index.html` polyfill layer locks `window.fetch` and `window.performance` before the app bundle. SW registration must happen in the inline `<script>` at end of body, not inside React components.
- **`workbox-cli generateSW` instead of `injectManifest`:** `generateSW` auto-generates the SW and adds navigation route handling that may conflict with the Expo Router SPA redirect pattern. `injectManifest` keeps full control.
- **Storing raw JSON string in IDB:** Parse `Question[]` at download time (once), store the parsed array. Reads from IDB return the array directly — no JSON parse on every question access.
- **Not using `dontCacheBustURLsMatching`:** Metro produces content-hashed JS filenames (`entry-abc123.js`). Without this option, workbox-build appends a `?__WB_REVISION__=...` query param, breaking the URL match against the actual file.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB wrapper | Custom IDB transaction management | `idb-keyval` | IDB transactions require careful error handling; keyval wraps this correctly in 1KB |
| SW lifecycle management | `navigator.serviceWorker.register()` + manual event listeners | `workbox-window` Workbox class | `waiting`/`controlling` event handling, update detection, `messageSkipWaiting()` built in |
| SW precache manifest generation | Glob files manually, write manifest JSON | `workbox-build injectManifest` | Handles cache busting, revision hashing, manifest injection into `self.__WB_MANIFEST` |
| Streaming download + byte counter | `ReadableStream` reader loop | Direct pattern in `downloadPackForOffline` | Simple enough to implement inline; no library needed for this |

**Key insight:** The hard part of SW + IDB is not the happy path — it's the edge cases: SW update races, IDB transaction conflicts, storage quota exceeded errors. Workbox and idb-keyval handle these.

---

## Common Pitfalls

### Pitfall 1: SW Scope and NavigationRoute with SPA Catch-All

**What goes wrong:** The `NavigationRoute` in the SW intercepts all navigation requests and tries to serve `index.html` from precache. If `index.html` is not in the precache manifest, navigation fails offline.

**Why it happens:** workbox-build globs files in `dist/` but `index.html` must be explicitly included in `globPatterns`.

**How to avoid:** Always include `'index.html'` in `globPatterns`. Verify it appears in the generated SW's `self.__WB_MANIFEST` after build.

**Warning signs:** Offline navigation works on first load (old SW controls) but fails after update.

---

### Pitfall 2: sw-template.js Uses ES Module Imports But SW Files Need Bundling

**What goes wrong:** `import { precacheAndRoute } from 'workbox-precaching'` in `sw-template.js` — browsers cannot `import` npm packages directly in service workers without bundling.

**Why it happens:** The template file looks like normal TypeScript but must be bundled. `workbox-build injectManifest` DOES handle bundling the SW file if you specify workbox modules from npm (not CDN).

**How to avoid:** Either (a) use Workbox from CDN with `importScripts()` in the SW template, or (b) use `workbox-build injectManifest` which bundles npm imports into the output SW. Do NOT import npm modules in the template and skip the build step.

**Warning signs:** `Failed to register service worker: The script has an unsyntactic import declaration.`

---

### Pitfall 3: idb-keyval Bundled Into React Native Build

**What goes wrong:** `import { get, set } from 'idb-keyval'` at module top level — React Native (Metro native build) bundles idb-keyval even though IndexedDB doesn't exist in RN runtime.

**Why it happens:** Metro does not tree-shake based on `Platform.OS` at import resolution time unless the import is dynamic.

**How to avoid:** Use the `services/packCache.ts` shim with `require('./packCache.web')` inside a `Platform.OS === 'web'` guard. Metro's static analysis will include the conditional, but RN runtime will execute the `null` branch and never call idb-keyval.

**Warning signs:** React Native build errors mentioning `indexedDB` or `IDBFactory`.

---

### Pitfall 4: IDB Store Name Collision with Existing Zustand Persist

**What goes wrong:** The Zustand persist middleware already uses `localStorage` (via `platformStorage.ts` on web). idb-keyval creates its own IndexedDB database. Name collision is not an issue here since they're different storage mechanisms, but misidentifying the store name could cause cross-contamination.

**Why it happens:** idb-keyval defaults to db name `'keyval-store'` / store `'keyval'`. This default is shared across all uses of idb-keyval without `createStore`.

**How to avoid:** Always use `createStore('trivial-world-packs', 'pack-cache')` and pass it to every idb-keyval call. Never use the default store.

**Warning signs:** IDB data disappears unexpectedly; other apps using idb-keyval on the same origin (localhost) corrupt data.

---

### Pitfall 5: navigator.storage.persist() Has No Visible Prompt on Modern Browsers

**What goes wrong:** Developer expects a browser permission dialog; the call returns `false` silently and the code path never tries again.

**Why it happens:** Chrome grants persist() automatically to installed PWAs and bookmarked sites. Safari 17+ calculates quota from disk space without prompting. Firefox may show a prompt but it's opt-in. No browser currently shows a mandatory prompt for this call. [CITED: https://webkit.org/blog/14403/updates-to-storage-policy/]

**How to avoid:** Call `persist()` once on first download and log the result. Don't block the download on the result — storage still works in best-effort mode, just with a lower eviction threshold. Don't show a "persistent storage denied" error to the user.

**Warning signs:** Developer tests on localhost, sees `false` returned, thinks storage is broken.

---

### Pitfall 6: workbox-build Must Run AFTER All dist/ Files Are Present

**What goes wrong:** The glob in `injectManifest` captures files in `dist/` at the moment it runs. If build script order is wrong (e.g., build-sw runs before `cp public/packs/*.json dist/packs/`), pack files are missing from the directory but the SW still generates.

**Why it happens:** Pack files are NOT precached (excluded by `globIgnores`), but the glob order still matters for correctness.

**How to avoid:** `node scripts/build-sw.mjs` must be the LAST step in the build script, after all `cp` commands.

**Warning signs:** SW builds without errors but `dist/sw.js` revision count is lower than expected.

---

### Pitfall 7: Vitest Does Not Support .web.ts Platform Extensions

**What goes wrong:** `vi.mock('../services/packCache')` in tests resolves to `packCache.ts` (the shim), not `packCache.web.ts` (the implementation). The shim returns noop functions, making tests vacuous.

**Why it happens:** Vitest's Rollup resolver does not implement Metro's platform extension priority (`.web.ts` > `.ts`). It resolves bare imports to the non-prefixed file.

**How to avoid:** In tests for the IDB layer, import `packCache.web.ts` directly:
```typescript
import * as packCache from '../services/packCache.web';
vi.mock('idb-keyval', () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn(), keys: vi.fn(), createStore: vi.fn(() => 'mock-store') }));
```

---

## Code Examples

### idb-keyval Full API Reference

```typescript
// Source: [CITED: https://github.com/jakearchibald/idb-keyval]
import { get, set, del, keys, entries, clear, update, setMany, getMany, delMany, createStore } from 'idb-keyval';

const store = createStore('db-name', 'store-name');

await set('key', value, store);            // store a value
const val = await get<string>('key', store);  // retrieve (null if missing)
await del('key', store);                   // delete one key
await delMany(['k1', 'k2'], store);        // delete multiple (one transaction)
const allKeys = await keys(store);         // IDBValidKey[]
await clear(store);                        // delete all entries
await update('counter', (v = 0) => v + 1, store); // atomic read-modify-write
```

### SW Registration (workbox-window)

```javascript
// Source: [CITED: https://github.com/googlechrome/workbox/blob/v7/packages/workbox-window/README.md]
import { Workbox } from 'workbox-window';

if ('serviceWorker' in navigator) {
  const wb = new Workbox('/sw.js');
  wb.addEventListener('waiting', () => wb.messageSkipWaiting());
  wb.addEventListener('controlling', () => window.location.reload());
  wb.register();
}
```

### Checksum-Based Invalidation in downloadPackForOffline

The `PackIndexEntry.checksum` field is a plain string (no format enforced at index level). `PackMetadata.checksum` is SHA-256. For update detection, compare the stored checksum string against the fetched index entry checksum:

```typescript
const storedChecksum = await getCachedPackChecksum(entry.id);
if (storedChecksum === entry.checksum) {
  // Content unchanged — skip re-download
  return;
}
// Proceed with download...
await setCachedPackChecksum(entry.id, entry.checksum);
```

[VERIFIED: `PackIndexEntrySchema` in `packages/types/src/question-pack.ts` — `checksum: z.string()` (line 71)]

### Vitest Mock for idb-keyval

```typescript
// In test file importing packCache.web.ts directly
import 'fake-indexeddb/auto'; // patches globalThis.indexedDB (optional — vi.mock is simpler)

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'mock-store'),
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
}));
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `webPackCache` (in-memory Map) | idb-keyval IndexedDB | Phase 23 | Pack questions persist across page reloads |
| No offline pack index | IDB-cached `pack-index` key | Phase 23 | Pack list visible when offline |
| No service worker | Workbox precache + SWR | Phase 23 | App shell loads offline after first visit |
| expo-webpack + workbox plugins | Metro post-build injectManifest | Expo SDK 37+ | Webpack removed from Expo; manual post-build required |

**Deprecated/outdated:**
- `@expo/webpack-config` Workbox plugin: Expo removed webpack support; the `offline: true` config option in `createExpoWebpackConfigAsync` is no longer available. [CITED: https://github.com/expo/fyi/blob/main/enabling-web-service-workers.md]
- `expo build:web`: Replaced by `expo export --platform web` in SDK 46+.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CDN import of workbox-window from `storage.googleapis.com/workbox-cdn/releases/7.4.0/...` is the best approach for index.html registration | Architecture Patterns, Pattern 3 | If CDN is unavailable at SW registration time, the SW never registers. Mitigation: use npm import bundled by Metro into a separate script, or inline the Workbox class. |
| A2 | `require('./packCache.web')` inside Platform.OS guard in packCache.ts will be tree-shaken from native Metro build | Architecture Patterns, Pattern 4 | If Metro includes idb-keyval in native bundle, RN build fails at runtime. Mitigation: use dynamic `await import()` pattern instead. |

---

## Open Questions

1. **workbox-build SW template bundling format**
   - What we know: `workbox-build injectManifest` processes the swSrc file and replaces `self.__WB_MANIFEST`. It also bundles npm imports if the SW template uses `import` statements.
   - What's unclear: Does `workbox-build 7.4.1` bundle the SW template's `import` statements using its own bundler (Rollup/esbuild), or does it expect the imports to already be resolved? If it does NOT bundle, the SW template must use `importScripts()` with CDN URLs.
   - Recommendation: Use CDN `importScripts()` in sw-template.js to sidestep bundling complexity entirely. This matches the Expo docs recommendation: `workbox-cli generateSW workbox-config.js` with CDN imports is the documented approach.

2. **offlinePackIds in packStore on web vs native**
   - What we know: `downloadedPackIds` in packStore currently tracks WatermelonDB downloads (native only). `refreshDownloadedPacks` returns early on web.
   - What's unclear: Should `downloadedPackIds` be repurposed for IDB offline IDs on web, or should a new `offlinePackIds` field be added?
   - Recommendation: Add `offlinePackIds: string[]` to packStore web-only state, populated from `getOfflinePackIds()`. Keep `downloadedPackIds` for native to avoid breaking the native download flow.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| idb-keyval | IDB pack cache | ✗ (not installed) | 6.2.5 on registry | — |
| workbox-build | Post-build SW injection | ✗ (not installed) | 7.4.1 on registry | — |
| workbox-window | SW registration | ✗ (not installed) | 7.4.1 on registry | workbox-window CDN |
| Node.js ESM (`scripts/build-sw.mjs`) | Build script | ✓ | Node 22+ (darwin) | — |
| expo export (Metro) | Web build | ✓ | Expo 56.0.11 | — |
| fake-indexeddb | Test IDB mocking | ✗ (not installed) | 6.2.5 on registry | vi.mock('idb-keyval') |
| dist/ (built output) | workbox glob | ✓ | Exists from prior builds | — |

**Missing dependencies requiring installation:**
- `idb-keyval`, `workbox-window` — prod deps in `apps/mobile`
- `workbox-build` — dev dep in `apps/mobile`
- `fake-indexeddb` — dev dep in `apps/mobile` (optional if using vi.mock)

---

## Project Constraints (from CLAUDE.md)

- **Test gating:** All tests must pass before commit. `npx vitest run` must exit with 0 failures.
- **No new TypeScript errors:** `npx tsc --noEmit` must complete without errors on new files.
- **No known broken tests:** If new test infrastructure (e.g., IDB mocks) causes existing tests to fail, fix them.
- **Pre-push gate:** Run full test suite before every push.
- **Git author:** Faiser / keepbreakfastsimple@gmail.com.
- **Mobile-first, offline-first:** This phase's entire purpose is offline-first web. All new code must not break the native (WatermelonDB) path.
- **No accounts, no friction:** The download flow must be one tap, with clear feedback.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] — idb-keyval 6.2.5, workbox-build 7.4.1, workbox-window 7.4.1, fake-indexeddb 6.2.5
- [CITED: https://github.com/jakearchibald/idb-keyval] — Context7 /jakearchibald/idb-keyval — get/set/del/keys/createStore API
- [CITED: https://developer.chrome.com/docs/workbox] — Context7 /googlechrome/workbox — injectManifest, StaleWhileRevalidate, workbox-window Workbox class
- [VERIFIED: packages/types/src/question-pack.ts] — `PackIndexEntry.checksum: z.string()` confirmed at line 71
- [VERIFIED: apps/mobile/dist/] — Metro web export structure: `_expo/static/js/web/*.js` hashed filenames, `index.html` at root

### Secondary (MEDIUM confidence)
- [CITED: https://github.com/expo/fyi/blob/main/enabling-web-service-workers.md] — Expo FYI SW guide: workbox as post-build step, not webpack integration
- [CITED: https://docs.expo.dev/guides/progressive-web-apps/] — Expo docs PWA: `expo export -p web && workbox generateSW` pattern
- [CITED: https://webkit.org/blog/14403/updates-to-storage-policy/] — Safari 17+ storage persist behavior (no prompt, automatic quota from disk space)

### Tertiary (LOW confidence)
- [ASSUMED] — CDN vs npm for workbox-window in index.html registration script
- [ASSUMED] — require() Platform.OS guard adequate for tree-shaking idb-keyval from native bundle

---

## Metadata

**Confidence breakdown:**
- Standard stack (idb-keyval, workbox): HIGH — npm registry verified, Context7 docs fetched
- Architecture (build integration): HIGH — confirmed by Expo FYI + dist/ structure inspection
- Pitfalls: HIGH — derived from direct codebase analysis (index.html polyfill layer, vitest config, packStore pattern)
- navigator.storage.persist(): HIGH — MDN + WebKit blog verified behavior

**Research date:** 2026-06-18
**Valid until:** 2026-08-18 (stable APIs; Expo SDK 57 release may change Metro output format)
