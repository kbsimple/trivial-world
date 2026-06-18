---
phase: 23-web-pack-downloading
plan: "01"
subsystem: services/pack-cache
tags:
  - indexeddb
  - idb-keyval
  - platform-shim
  - offline
  - web
dependency_graph:
  requires: []
  provides:
    - packCache.ts (platform shim — all other phase-23 plans import this)
    - packCache.web.ts (idb-keyval IDB implementation)
  affects:
    - apps/mobile/services/packCache.ts
    - apps/mobile/services/packCache.web.ts
tech_stack:
  added:
    - idb-keyval@6.2.5
  patterns:
    - Platform.OS guard + synchronous require() shim (mirrors platformStorage.ts pattern)
    - vi.mock('idb-keyval') with direct packCache.web.ts import in tests (avoids Platform.OS=ios no-op)
key_files:
  created:
    - apps/mobile/services/packCache.web.ts
    - apps/mobile/services/packCache.ts
    - apps/mobile/services/packCache.web.test.ts
  modified:
    - apps/mobile/package.json (idb-keyval 6.2.5 added)
    - pnpm-lock.yaml
decisions:
  - "Install idb-keyval in Plan 01 (not Plan 02): vitest's vite:import-analysis resolves all imports before vi.mock() factory runs, so the package must be installed for tests to collect, even when fully mocked."
  - "requestPersistentStorage adds null guard for navigator.storage: 'storage' in navigator can be true while navigator.storage is null/undefined in some jsdom configurations, so double-guard prevents TypeError."
  - "beforeEach uses mockGet/Set/Del/Keys.mockReset() individually instead of vi.clearAllMocks(): createStore is called at module load time; vi.clearAllMocks() would wipe the call record before the test asserts on it."
metrics:
  duration: "~4 minutes"
  completed: "2026-06-18"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
---

# Phase 23 Plan 01: Pack Cache Platform Shim Summary

**One-liner:** Two-file platform shim exposing 9 idb-keyval IDB operations on web and typed no-op stubs on native, with 22 passing unit tests.

## What Was Built

### packCache.web.ts
Full idb-keyval implementation using a named store (`createStore('trivial-world-packs', 'pack-cache')`). Key scheme:
- `pack:{packId}` — `Question[]` array (parsed once on download)
- `pack-checksum:{packId}` — string for update detection
- `pack-index` — `PackIndexEntry[]` for offline pack list

`getOfflinePackIds()` filters to `pack:` keys only, explicitly excluding `pack-checksum:` entries. `requestPersistentStorage()` guards for missing `navigator.storage` with both `'storage' in navigator` and a null check.

### packCache.ts
Platform shim that wraps all 9 functions. On web: `const impl = require('./packCache.web')` inside `Platform.OS === 'web'` guard. On native: typed async no-op lambdas (`async () => null`, `async () => {}`, `async () => []`, `async () => false`) matching each function's return type.

No top-level `import` of idb-keyval — Metro native bundle excludes idb-keyval entirely.

### packCache.web.test.ts
22 unit tests covering: store initialization args, per-function key scheme verification, `getOfflinePackIds` filter logic (excludes `pack-checksum:` and `pack-index` keys), `deleteCachedPack` removes both keys, `requestPersistentStorage` handles missing storage API.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed idb-keyval in Plan 01 instead of Plan 02**
- **Found during:** Task 1 GREEN phase — vitest's `vite:import-analysis` plugin resolves all imports before `vi.mock()` factory executes, causing `"Failed to resolve import 'idb-keyval'"` even with a mock defined.
- **Fix:** Installed `idb-keyval@6.2.5` as a prod dependency in `apps/mobile` immediately. Plan 02 will skip the idb-keyval install step (already present).
- **Files modified:** `apps/mobile/package.json`, `pnpm-lock.yaml`
- **Commits:** `ee59b08`

**2. [Rule 1 - Bug] Fixed requestPersistentStorage null guard in packCache.web.ts**
- **Found during:** Task 1 GREEN phase — test simulates `navigator.storage = undefined`; the expression `'persist' in navigator.storage` throws `TypeError: Cannot use 'in' operator to search for 'persist' in undefined` because JavaScript evaluates both sides of `&&` before short-circuit in this case (the `in` operator throws before returning false when the right-hand side is `undefined`).
- **Fix:** Added `navigator.storage != null &&` between the two `in` checks.
- **Files modified:** `apps/mobile/services/packCache.web.ts`

**3. [Rule 1 - Bug] Fixed vi.clearAllMocks() wiping module-level createStore call record**
- **Found during:** Task 1 GREEN phase — `beforeEach(() => { vi.clearAllMocks(); })` cleared the call history of `mockCreateStore`, which was invoked at module import time (before any test ran). The createStore initialization test then found 0 calls.
- **Fix:** Changed to per-mock `.mockReset()` calls on `mockGet/Set/Del/Keys`, leaving `mockCreateStore` call history intact.
- **Files modified:** `apps/mobile/services/packCache.web.test.ts`

## Pre-existing Test Failures (Out of Scope)

Four test files fail with `Failed to resolve entry for package "@trivial-world/types"` — a pre-existing build artifact issue unrelated to this plan. These failures existed before Plan 01 execution and were not introduced by our changes:
- `services/packAssets.test.ts`
- `services/packComboSchema.test.ts`
- `services/questionSchema.test.ts`
- `stores/questionStore.test.ts`

All 253 other tests pass (including our 22 new tests).

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary changes. The IDB store is same-origin, write-only from validated data (packId comes from PackIndexEntry, not user input). Threat model dispositions T-23-01-01 through T-23-01-03 all accepted as planned.

## Self-Check: PASSED

| Item | Result |
|------|--------|
| `apps/mobile/services/packCache.web.ts` | FOUND |
| `apps/mobile/services/packCache.ts` | FOUND |
| `apps/mobile/services/packCache.web.test.ts` | FOUND |
| `.planning/phases/23-web-pack-downloading/23-01-SUMMARY.md` | FOUND |
| Commit `c91e844` (RED test) | FOUND |
| Commit `ee59b08` (GREEN implementation) | FOUND |
| Commit `6acbcfc` (Task 2 shim) | FOUND |
