# Phase 23: Web Pack Downloading - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the web app work offline after first visit by implementing:
1. Service Worker (Workbox) — stale-while-revalidate for pack index, precache for app shell
2. IndexedDB (idb-keyval) — durable pack body storage, checksum-based invalidation
3. `navigator.storage.persist()` — request persistent storage quota on first visit
4. Explicit "Download for offline" button per pack with inline progress feedback

The existing `questionProvider.ts` web path currently uses in-memory `webPackCache` (wiped on reload).
The existing `packIndex.ts` always fetches from network with no offline fallback.
Both need to be updated. Mobile (WatermelonDB) path is untouched.

PROJECT.md previously listed IndexedDB and Service Worker as "Out of Scope" — this phase supersedes those entries.

</domain>

<decisions>
## Implementation Decisions

### Service Worker Implementation
- Use Workbox (workbox-window + workbox-sw via CDN or npm) — handles SW lifecycle, retry logic, precache manifest
- Register SW in `public/index.html` inline script (loads before app bundle, no RN dependency)
- SW update strategy: silent background update + reload on next navigation (no banner)

### IndexedDB Storage Design
- Use `idb-keyval` (~1KB gzipped, zero-config key-value wrapper)
- Store parsed `Question[]` arrays keyed by packId (parse once on download, fast reads)
- Cache key scheme: `pack:{packId}` with separate `pack-checksum:{packId}` entry for update detection
- Also cache pack index (available packs list) in IndexedDB to show pack list when offline

### Download Trigger & User Feedback
- Explicit "Download for offline" button per pack in the pack list (not auto-download — avoids surprise bandwidth use)
- Progress feedback: inline spinner + byte counter in pack list row while downloading
- Status badge: "Downloaded ✓" text badge on pack rows that are cached in IndexedDB
- Offline graceful degradation: when offline and no IndexedDB cache, fall back to bundled default questions (don't crash)

### Claude's Discretion
- Exact Workbox version and integration method (CDN vs npm install)
- Whether to update PROJECT.md Out of Scope section (should remove SW + IndexedDB from that list)
- Service worker file naming and placement in `public/`
- idb-keyval store initialization (single store vs per-type stores)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/mobile/services/questionProvider.ts` — `fetchWebPackQuestions()` uses in-memory `webPackCache`; needs IndexedDB check before network fetch
- `apps/mobile/services/packIndex.ts` — `fetchPackIndex()` always hits network; needs IndexedDB fallback for offline
- `apps/mobile/stores/packStore.ts` — `fetchAvailablePacks()` action sets `availablePacks`; IndexedDB-cached index can populate this on offline startup
- `apps/mobile/constants/packConfig.ts` — `GENERATOR_PACK_INDEX_URL` is the index URL; `PACK_DOWNLOAD_TIMEOUT_MS` = 60s
- `public/index.html` — clean SW registration point exists before `</body>` closing tag
- `public/manifest.webmanifest` — already exists (Phase 11 PWA manifest)

### Established Patterns
- Platform guards: `if (Platform.OS === 'web')` used throughout `questionProvider.ts` and other services
- Dynamic imports to avoid web bundling: `await import('../database')` pattern in mobile-only code
- Zustand `persist` with `platformStorage` (AsyncStorage/localStorage) already used in packStore
- `PackIndexEntry` and `QuestionPack` types from `@trivial-world/types` are Zod-validated

### Integration Points
- `fetchWebPackQuestions()` in `questionProvider.ts` — add IndexedDB read before network fetch
- `fetchPackIndex()` in `packIndex.ts` — add IndexedDB read on network failure (offline fallback)
- `packStore.ts` — update `fetchAvailablePacks` to populate from IndexedDB when offline; add `downloadPackForOffline` action
- Pack list UI (`apps/mobile/app/packs/index.tsx`) — add "Download ↓" button and "Downloaded ✓" badge per row
- `public/index.html` — add SW registration script

</code_context>

<specifics>
## Specific Ideas

From prior conversation discussion:
- "Stale-while-revalidate for packs.json" — serve cached index immediately, refresh in background
- "IndexedDB for durable pack bodies (not Cache API which can be evicted)" — explicit user preference for IndexedDB over Cache API
- "navigator.storage.persist() to request persistent storage" — call this on first use
- Checksum comparison: when online, fetch index, compare checksums against stored `pack-checksum:{packId}` entries, re-download only changed packs
- The existing `downloadUrl` in `PackIndexEntry` is the pack's fetch URL; `checksum` field exists in the schema (verify this)

</specifics>

<deferred>
## Deferred Ideas

- Auto-download all packs in background on first visit (bandwidth concern, deferred to user decision)
- "Update available" banner for SW updates (deferred — silent reload chosen)
- Offline indicator in app header/navbar (out of scope for this phase — focus on pack download)
- Per-player offline pack management (each player downloads their own pack — complexity deferred)

</deferred>
