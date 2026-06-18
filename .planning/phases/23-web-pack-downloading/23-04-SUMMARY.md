---
phase: 23-web-pack-downloading
plan: "04"
subsystem: stores/pack-store
tags:
  - zustand
  - indexeddb
  - offline
  - web
  - platform-shim
dependency_graph:
  requires:
    - packCache.ts (platform shim, from 23-01)
    - packCache.web.ts (idb-keyval IDB impl, from 23-01)
  provides:
    - offlinePackIds state field in packStore
    - downloadPackForOffline action
    - refreshOfflinePackIds action
    - fetchAvailablePacks now caches pack index to IDB
  affects:
    - apps/mobile/stores/packStore.ts
    - apps/mobile/stores/packStore.test.ts
tech_stack:
  added: []
  patterns:
    - fire-and-forget IDB write in fetchAvailablePacks (setCachedPackIndex.catch)
    - checksum skip-re-download (storedChecksum === entry.checksum early return)
    - ReadableStream chunk reader loop with per-chunk progress updates
    - dynamic import(../services/packCache.web) for web-only IDB ops inside action
    - QuestionPackSchema.safeParse validation before IDB write (T-23-04-01 mitigated)
key_files:
  created: []
  modified:
    - apps/mobile/stores/packStore.ts
    - apps/mobile/stores/packStore.test.ts
decisions:
  - "Static import QuestionPackSchema from @trivial-world/types instead of dynamic import: packStore.ts already statically imports from @trivial-world/types; dynamic import was spec'd to avoid native bundling but the schema is already in the bundle. Static import is simpler and avoids vitest vite:import-analysis failures."
  - "Use vi.mocked(setCachedPackIndex).mockResolvedValue(undefined) as default in beforeEach: clearAllMocks() resets mock to return undefined (not a Promise), which breaks the fire-and-forget .catch() chain. Default resolved value prevents existing fetchAvailablePacks tests from failing."
metrics:
  duration: "~15 minutes"
  completed: "2026-06-18"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 2
---

# Phase 23 Plan 04: packStore Offline State + Actions Summary

**One-liner:** packStore extended with offlinePackIds state, downloadPackForOffline (streaming fetch + Zod validation + IDB store), and refreshOfflinePackIds, plus fire-and-forget IDB index caching in fetchAvailablePacks.

## What Was Built

### packStore.ts — New State Field

`offlinePackIds: string[]` initialized to `[]`. Included in `partialize` config so it survives page reload. Separate from `downloadedPackIds` (WatermelonDB native path — unchanged).

### packStore.ts — New Actions

**`refreshOfflinePackIds()`:** Calls `getOfflinePackIds()` from the packCache platform shim and sets `offlinePackIds` in state. On native, the shim returns `[]` (no-op behavior). Used after `downloadPackForOffline` to sync state.

**`downloadPackForOffline(entry: PackIndexEntry)`:**
1. Sets `isDownloading: true, downloadProgress: 0` at start
2. Dynamic imports `packCache.web` to get `getCachedPackChecksum`, `setCachedPackQuestions`, `setCachedPackChecksum`, `getOfflinePackIds`, `requestPersistentStorage`
3. Checksum skip: if `storedChecksum === entry.checksum`, sets `isDownloading: false, downloadProgress: 100`, returns early (no re-download)
4. Streaming fetch with ReadableStream chunk reader — updates `downloadBytesWritten` and `downloadProgress` per chunk
5. Decodes chunks, `QuestionPackSchema.safeParse(JSON.parse(text))` — throws `'Pack validation failed'` if invalid
6. Stores validated questions: `setCachedPackQuestions(entry.id, result.data.questions)`
7. Persists checksum: `setCachedPackChecksum(entry.id, entry.checksum)` 
8. `requestPersistentStorage()` for durable quota on first download
9. Refreshes `offlinePackIds` from `getIDBOfflineIds()`, sets `isDownloading: false, downloadProgress: 100`
10. Error path: sets `downloadError`, resets progress fields, re-throws

### packStore.ts — Modified fetchAvailablePacks

After `set({ availablePacks: packs })`, fires `setCachedPackIndex(packs).catch(err => console.warn(...))` without `await`. This populates IDB with the latest pack list for use in offline startup (Plan 03 `fetchAvailablePacks` fallback).

### packStore.test.ts

Two TDD cycles added:

**Task 1 RED/GREEN (5 new tests):**
- `offlinePackIds` initialized to `[]`
- `refreshOfflinePackIds` calls `getOfflinePackIds` and updates state
- `fetchAvailablePacks` calls `setCachedPackIndex` fire-and-forget
- `fetchAvailablePacks` doesn't throw when `setCachedPackIndex` rejects

**Task 2 RED/GREEN (8 new tests):**
- Checksum skip-re-download: `storedChecksum === entry.checksum` → no fetch, progress 100
- Successful download: `fetch` called, `setCachedPackQuestions` called, `setCachedPackChecksum` called
- `requestPersistentStorage` called after IDB write
- `offlinePackIds` refreshed, `downloadProgress: 100` on success
- Network failure sets `downloadError` and re-throws
- Schema validation failure: invalid JSON → `downloadError: 'Pack validation failed'`
- HTTP 404 → `downloadError: 'HTTP 404'`

**Baseline improvement:** Building `@trivial-world/types` dist/ in the worktree resolved 4 previously-failing test files (packAssets, packComboSchema, questionSchema, questionStore). All 384 tests pass (was 253 passing pre-build).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Static import QuestionPackSchema instead of dynamic import**
- **Found during:** Task 2 RED phase — `vi.mock('@trivial-world/types')` factory in test broke vitest's `vite:import-analysis` module resolution for the entire test file, preventing all 57 tests from running
- **Issue:** The plan specified `await import('@trivial-world/types')` inside `downloadPackForOffline`. When the test mocked this via `vi.mock('@trivial-world/types')`, vitest hoists the mock and tries to resolve the package as a file path, failing with `ERR_MODULE_NOT_FOUND`
- **Fix:** Import `QuestionPackSchema` statically at the top of `packStore.ts` alongside the existing `PackIndexEntry` import (same file, same bundle — no native bundle impact since @trivial-world/types is already bundled). Removed `vi.mock('@trivial-world/types')` from test entirely
- **Files modified:** `apps/mobile/stores/packStore.ts`, `apps/mobile/stores/packStore.test.ts`
- **Commit:** `bc8f946`

**2. [Rule 3 - Blocking] Built @trivial-world/types dist/ in worktree**
- **Found during:** Task 2 RED phase — `apps/mobile/node_modules/@trivial-world/types/` lacked `dist/` after fresh `pnpm install` in worktree. This caused 4 test files to fail with `Failed to resolve entry for package "@trivial-world/types"`
- **Issue:** pnpm installed the workspace package from source but did not build it (no `prepare` script in package.json)
- **Fix:** Ran `pnpm --filter @trivial-world/types build`. This is a deviation from Plan 01 which noted these 4 files as "pre-existing failures" — they were actually a missing build artifact, not a fundamental issue
- **Files modified:** `packages/types/dist/` (generated, not committed)
- **Impact:** Test count went from 253 to 384 passing (all 11 test files green)

**3. [Rule 1 - Bug] Default mock implementation for setCachedPackIndex in beforeEach**
- **Found during:** Task 1 GREEN phase — existing `fetchAvailablePacks` tests broke because `vi.clearAllMocks()` reset `setCachedPackIndex` mock to return `undefined` (not a Promise), causing `.catch()` to throw `TypeError: Cannot read properties of undefined`
- **Fix:** Added `vi.mocked(setCachedPackIndex).mockResolvedValue(undefined)` and `vi.mocked(getOfflinePackIds).mockResolvedValue([])` as defaults in `beforeEach` after `vi.clearAllMocks()`
- **Files modified:** `apps/mobile/stores/packStore.test.ts`
- **Commit:** `1fdcc5e`

## Threat Mitigations Applied

| Threat ID | Mitigation | Verified |
|-----------|------------|---------|
| T-23-04-01 (Tampering - pack body) | `QuestionPackSchema.safeParse()` validates before IDB write; invalid packs throw and are not stored | Yes — test "sets downloadError on pack validation failure" covers this |
| T-23-04-02 (DoS - stream size) | Accepted — entry.size provides expected size; no explicit limit needed at ~30KB | Yes |
| T-23-04-03 (Repudiation - persist storage) | Accepted — boolean result not user-visible | Yes |

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| Task 1 RED | `b7e557b` | PASS |
| Task 1 GREEN | `1fdcc5e` | PASS |
| Task 2 RED | `a6dd980` | PASS |
| Task 2 GREEN | `bc8f946` | PASS |

## Known Stubs

None. `downloadPackForOffline` is fully implemented with real IDB writes, streaming fetch, and schema validation.

## Threat Flags

None. No new network endpoints or auth paths. `downloadPackForOffline` uses the same `entry.downloadUrl` as the native `downloadPackWithProgress`. Trust boundary is network → Zod validation → IDB, consistent with T-23-04-01 mitigation.

## Self-Check: PASSED

| Item | Result |
|------|--------|
| `apps/mobile/stores/packStore.ts` | FOUND |
| `apps/mobile/stores/packStore.test.ts` | FOUND |
| Commit `b7e557b` (Task 1 RED) | FOUND |
| Commit `1fdcc5e` (Task 1 GREEN) | FOUND |
| Commit `a6dd980` (Task 2 RED) | FOUND |
| Commit `bc8f946` (Task 2 GREEN) | FOUND |
| All 384 tests pass | CONFIRMED |
| offlinePackIds in interface, initial state, partialize | CONFIRMED |
| downloadedPackIds unchanged | CONFIRMED |
| storedChecksum === entry.checksum skip logic | CONFIRMED |
