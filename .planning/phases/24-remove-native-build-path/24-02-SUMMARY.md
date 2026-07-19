---
phase: 24-remove-native-build-path
plan: 02
subsystem: infra
tags: [platform, pwa, idb, zustand, react-native, expo-router]

# Dependency graph
requires:
  - phase: 24-remove-native-build-path (plan 01)
    provides: Native artifacts deleted (database/, packDownloader.ts, platformStorage.native.ts) and RN mock flipped to Platform.OS='web'
provides:
  - Production source with zero Platform.OS conditionals — web/PWA path is the only path
  - services/packCache.ts as a thin re-export shim of packCache.web.ts (canonical entry for all callers)
  - stores/packStore.ts re-wired from the deleted packDownloader to the packCache web IDB API
  - stores/questionStore.ts, services/questionProvider.ts with no dynamic WatermelonDB Q imports
  - app/_layout.tsx, app/index.tsx, app/game/_layout.tsx, app/game/setup.tsx with no database/ imports
affects: [24-03-rewrite-tests-and-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single web code path — every previously-branched file inlines the web (IDB/sessionStorage) branch as the only path"
    - "packCache.ts as canonical re-export shim — stores import from '../services/packCache', never packCache.web.ts directly"

key-files:
  created: []
  modified:
    - apps/mobile/services/packCache.ts
    - apps/mobile/services/packIndex.ts
    - apps/mobile/services/questionProvider.ts
    - apps/mobile/services/packIndex.web.test.ts
    - apps/mobile/stores/packStore.ts
    - apps/mobile/stores/questionStore.ts
    - apps/mobile/utils/haptics.ts
    - apps/mobile/components/PauseOverlay.tsx
    - apps/mobile/app/index.tsx
    - apps/mobile/app/_layout.tsx
    - apps/mobile/app/game/_layout.tsx
    - apps/mobile/app/game/setup.tsx
    - apps/mobile/app/packs/index.tsx
    - apps/mobile/app/packs/combos.tsx

key-decisions:
  - "packCache.ts collapsed to a static `export ... from './packCache.web'` re-export — no Platform guard, no require() at module-eval time. Stores import from '../services/packCache' (the shim), never packCache.web.ts directly."
  - "packStore.downloadPack (formerly the native packDownloader entry) now delegates to downloadPackForOffline (the IDB streaming-download path) — both actions share the same web implementation."
  - "packStore.refreshDownloadedPacks is retained as a no-op for callers that still reference it; downloadedPackIds stays [] (web has no WatermelonDB-downloaded packs)."
  - "app/index.tsx, app/game/setup.tsx: the WatermelonDB pack-name lookup was replaced with an in-memory availablePacks.find(p => p.id === activePackId) lookup from the pack store."
  - "app/game/_layout.tsx: the BackHandler hardware-back-press effect (Android-only) was removed entirely; the header label collapses to the web '☰' glyph."
  - "Removed 3 native-path assertions from services/packIndex.web.test.ts (see Deviations)."

patterns-established:
  - "Web/PWA-only source: no Platform.OS conditionals, no dynamic WatermelonDB imports, no database/ imports in production code"

requirements-completed:
  - GOAL-collapse-Platform-OS-branches
  - GOAL-remove-dynamic-watermelondb-imports

# Metrics
duration: ~15min
completed: 2026-07-18
---

# Phase 24 Plan 02: Collapse Platform.OS Branches to Web/PWA-only Summary

**Inlined the web (IDB + sessionStorage) branch as the sole code path across 13 production files; rewired packStore from the deleted packDownloader to the packCache web API; removed every dynamic `@nozbe/watermelondb` import and `database/` import from production source.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-18
- **Completed:** 2026-07-18
- **Tasks:** 2
- **Files modified:** 14 (13 production source + 1 service test)

## Accomplishments

- **Task 1 (services):** Collapsed `Platform.OS` branches in `services/packCache.ts`, `services/packIndex.ts`, `services/questionProvider.ts`. `packCache.ts` is now a static re-export of the `packCache.web.ts` IDB API (no Platform guard, no `require()` at module-eval time). `packIndex.ts` inlines the IDB write-through + offline fallback as the only path. `questionProvider.ts` inlines the IDB-first `getNextQuestionFromBundle` / `getQuestionsByCategory` paths and removes both `const { Q } = await import('@nozbe/watermelondb')` blocks plus the two `getDatabase` dynamic imports.
- **Task 2 (stores + UI):** Collapsed `Platform.OS` branches in 10 files:
  - `stores/packStore.ts`: replaced the deleted `packDownloader` import with a static `import { ... } from '../services/packCache'`; removed the dynamic `await import('../services/packCache.web')` at the old line ~129; `downloadPack` delegates to `downloadPackForOffline`; `refreshDownloadedPacks` is a no-op; `selectPack` / `selectPackList` drop the `setActivePack` native call.
  - `stores/questionStore.ts`: inlined the web branch in `selectQuestion`, `markAsked`, `unmarkAsked`, `resetAskedQuestions`; removed all four `Q` dynamic-import blocks and the three `getDatabase` / `QuestionModel` dynamic imports; dropped the now-unused `logger` import.
  - `utils/haptics.ts`, `components/PauseOverlay.tsx`: web no-op / dropdown is the sole path; `Platform` import removed.
  - `app/index.tsx`, `app/game/_layout.tsx`, `app/game/setup.tsx`: removed `await import('../database')` / `await import('@nozbe/watermelondb')` native-fallback blocks; pack name resolved from the in-memory `availablePacks.find(...)` lookup. `app/index.tsx` web auto-redirect effect is now unconditional. `app/game/_layout.tsx` drops the `BackHandler` hardware-back effect and the `Platform.OS === 'web' ? '☰' : 'Pause'` ternary (now just `'☰'`). `app/game/setup.tsx` drops the `import type { QuestionPackModel } from '../../database/models'` line.
  - `app/_layout.tsx`: removed the database-initialization effect and the `isInitialized` gate; the navigator renders immediately on first render.
  - `app/packs/index.tsx`: collapsed all Platform.OS branches — `refreshOfflinePackIds` runs unconditionally on mount; the WatermelonDB version-load effect is replaced with a no-op `setDownloadedPackVersions({})`; the download-retry alert always uses `handleDownloadForOffline`; the download-progress render guard, the per-pack offline row, and `PackDetailsModal`'s `onDownload`/`onSelect` are all collapsed to their web-only forms. The dead `handleDownload` (native downloader wrapper) was removed.
  - `app/packs/combos.tsx`: `selectablePacks = availablePacks` (no native download gate); `Platform` import removed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Collapse Platform.OS branches in services (packIndex, questionProvider, packCache)** — `71abd04` (refactor)
2. **Task 2: Collapse Platform.OS branches in stores and UI** — `6897147` (refactor)

## Files Created/Modified

- `apps/mobile/services/packCache.ts` — thin re-export of packCache.web.ts IDB API (no Platform guard)
- `apps/mobile/services/packIndex.ts` — IDB write-through + offline fallback as sole path; imports `setCachedPackIndex` / `getCachedPackIndex` from `./packCache`
- `apps/mobile/services/questionProvider.ts` — IDB-first web path inlined; `Platform` import and both `Q` blocks removed
- `apps/mobile/services/packIndex.web.test.ts` — 3 native-path assertions removed (see Deviations)
- `apps/mobile/stores/packStore.ts` — rewired to `../services/packCache`; `downloadPack` delegates to `downloadPackForOffline`; `refreshDownloadedPacks` is a no-op; `selectPack`/`selectPackList` drop `setActivePack`
- `apps/mobile/stores/questionStore.ts` — web branch inlined; all four `Q` dynamic-import blocks removed; `logger` import dropped
- `apps/mobile/utils/haptics.ts` — no-op web branch is the sole path
- `apps/mobile/components/PauseOverlay.tsx` — dropdown (Modal) web branch is the sole implementation
- `apps/mobile/app/index.tsx` — pack name from `availablePacks.find`; web auto-redirect unconditional; `QuestionPackModel` import removed
- `apps/mobile/app/_layout.tsx` — no database init; navigator renders on first render
- `apps/mobile/app/game/_layout.tsx` — `BackHandler` effect removed; header label is `'☰'`; `phase` selector dropped
- `apps/mobile/app/game/setup.tsx` — pack name from `availablePacks.find`; `QuestionPackModel` import and database fallback removed
- `apps/mobile/app/packs/index.tsx` — all Platform.OS branches collapsed; `handleDownload` removed; `refreshDownloadedPacks` destructure dropped
- `apps/mobile/app/packs/combos.tsx` — `selectablePacks = availablePacks`; `Platform` and `downloadedPackIds` imports removed

## Decisions Made

- **packCache.ts as a static re-export shim:** rather than keeping the `require('./packCache.web')` synchronous-require pattern, collapsed to `export ... from './packCache.web'`. This lets `packStore.ts` use a static top-of-file `import { ... } from '../services/packCache'` and removes the dynamic `await import('../services/packCache.web')` at the old line ~129, satisfying the plan's "no `packCache.web` import may remain in stores/" rule.
- **`downloadPack` delegates to `downloadPackForOffline`:** the plan asked for the deleted `downloadPackWithProgress` to be replaced with the equivalent web-path API from `packCache.ts`, but packCache has no direct equivalent (it exposes IDB primitives, not a streaming downloader). The web path's streaming-download logic already lives in `downloadPackForOffline`, so `downloadPack` simply delegates. Both store actions remain in the API so callers in `app/packs/index.tsx` stay unchanged.
- **`refreshDownloadedPacks` retained as a no-op:** the plan said "inline the web branch as the only path" and the web branch was `return`. Keeping the function as a no-op preserves the store's action surface; `downloadedPackIds` stays `[]` and the web offline-availability list (`offlinePackIds`) is hydrated separately by `refreshOfflinePackIds`.
- **Pack-name resolution via `availablePacks.find`:** in `app/index.tsx` and `app/game/setup.tsx`, the WatermelonDB `database.get('question_packs').query(Q.where('pack_id', ...))` lookup was replaced with `usePackStore(s => s.availablePacks).find(p => p.id === activePackId)`. This matches the existing `setup.tsx` "web-safe" path that was already inlined pre-24-02.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed 3 native-path assertions from `services/packIndex.web.test.ts`**
- **Found during:** Task 1 verification
- **Issue:** The plan's Task 1 acceptance criteria requires `npx vitest run services/packCache.web.test.ts services/packIndex.web.test.ts services/questionProvider.web.test.ts` to exit 0, AND says "Do NOT modify the existing web-path tests... they should continue to pass unchanged." These two instructions are mutually contradictory: `packIndex.web.test.ts` contained three native-path assertions (`"does not call setCachedPackIndex on native platform"`, `"throws original error on native platform when fetch fails"`, `"does not call getCachedPackIndex on native platform"`) that set `mockPlatform.OS = 'ios'` and asserted the deleted native branch's behavior. After the collapse, `setCachedPackIndex` / `getCachedPackIndex` are called unconditionally, so these assertions fail (2 of the 3 fail outright; the third passes only by coincidence).
- **Fix:** Removed all 3 native-path `it(...)` blocks from `packIndex.web.test.ts` (the entire "does not call setCachedPackIndex on native platform" test and the two "throws original error on native platform" / "does not call getCachedPackIndex on native platform" tests). Updated the file header comment to document the removal. The remaining 5 web-path assertions (IDB write-through on success, IDB cached-pack return on fetch failure, rethrow when IDB empty) all continue to pass. The unused `mockPlatform` hoisted variable and `vi.mock('react-native', ...)` factory were left in place — they are now dead code but harmless, and removing them would expand the diff beyond the deviation's scope. (They can be cleaned up in 24-03 when the rest of the test suite is rewritten.)
- **Files modified:** `apps/mobile/services/packIndex.web.test.ts`
- **Commit:** `71abd04`

No other deviations. All other plan instructions were followed exactly.

### Deferred Items

**1. [Deferred to 24-03 per plan] Stores test files (`packStore.test.ts`, `questionStore.test.ts`) still mock the deleted native path**
- **Found during:** Task 2 verification
- **Issue:** `stores/packStore.test.ts:63` references `Cannot find module '../services/packDownloader'` (tsc error TS2307); `stores/packStore.test.ts` also mocks `../services/packCache.web` directly (lines 48-71). The plan explicitly states: "Do NOT modify the test files in this plan (`stores/questionStore.test.ts`, `stores/packStore.test.ts`) — those are rewritten in 24-03." These tests will fail at runtime until 24-03 rewrites them.
- **Resolution:** Expected per plan and per orchestrator execution_notes ("After 24-02, the stores tests ... WILL fail — that is EXPECTED and is 24-03's job to fix"). Not a 24-02 responsibility.
- **Impact:** `npx tsc --noEmit` reports 4 errors in test files (8 lines total with context), all pre-existing or 24-03 scope. 24-02 introduced zero new tsc errors in production source. Test-suite greenness is 24-03's gate, not 24-02's.

## Issues Encountered

None beyond the deviation and deferred items above. All Task 1 and Task 2 acceptance-criteria greps pass (verified inline). `npx tsc --noEmit` error count dropped from 28 lines (post-24-01, pre-24-02) to 8 lines (post-24-02) — a net reduction of 20 lines, exactly as the orchestrator predicted ("FEWER errors than after 24-01... Remaining tsc errors should only be from test files").

## User Setup Required

None — pure source refactor; no external configuration, no env vars, no services.

## Next Phase Readiness

- 24-02 is complete: every `Platform.OS` conditional in production source is collapsed; no `@nozbe/watermelondb` dynamic imports remain in production code; no `database/` imports remain in production code; `packStore` is rewired to the `packCache` web API; `stores/` no longer imports `packCache.web` directly.
- 24-03 can now rewrite the native-path test files (`stores/questionStore.test.ts`, `stores/packStore.test.ts`, and any `playerStore`/`gameStore` tests still mocking `async-storage`) for the web path, run `pnpm install` to prune the lockfile of the removed deps, and execute the full gate (`npx vitest run`, `npx tsc --noEmit`, `pnpm build:web`).
- The 4 remaining tsc errors are all in test files: 2 pre-existing test-data type mismatches (`packCache.web.test.ts:92`, `packIndex.web.test.ts:59`) and 2 in `packStore.test.ts` from the deleted `packDownloader` module — all 24-03 scope.
- Known stubs: none introduced by this plan.

## Known Stubs

None — this plan only collapses existing branches to the existing web path; it introduces no stubbed data paths and no placeholder values.

## Threat Flags

None. The trust boundary (IDB → zustand stores via `platformStorage` / `packCache`) is unchanged; only dead native branches were removed. The threat-model mitigations (T-24-04 retain web-branch try/catch + IDB fallback; T-24-05 `packStore` rewired to `packCache` with correct function names) are satisfied: the existing web-branch error handling is preserved verbatim, and the `packCache` re-export exposes the exact same function names that `packStore` now imports (`getCachedPackChecksum`, `setCachedPackQuestions`, `setCachedPackChecksum`, `setCachedPackIndex`, `getOfflinePackIds`, `requestPersistentStorage`).

## Self-Check: PASSED

- All 14 declared modified files exist on disk (verified via the Task 1/2 git commits `71abd04` and `6897147`).
- Both task commits present in git log: `71abd04` (Task 1 services collapse) and `6897147` (Task 2 stores/UI collapse).
- Task 1 acceptance greps pass: no `Platform.OS` / `watermelondb` matches in `services/packIndex.ts`, `services/questionProvider.ts`, `services/packCache.ts`.
- Task 2 acceptance greps pass:
  - `grep -rn "Platform.OS" app/ stores/packStore.ts stores/questionStore.ts utils/haptics.ts components/PauseOverlay.tsx` → no matches
  - `grep -rn "watermelondb" app/ stores/packStore.ts stores/questionStore.ts utils/haptics.ts components/PauseOverlay.tsx` → no matches
  - `grep -rn "packDownloader" stores/packStore.ts` → no matches
  - `grep -rEn "from.*'../database'|from.*'../../database'" app/ stores/` → no matches
  - `grep -rn "packCache.web" stores/packStore.ts stores/questionStore.ts` → no matches
  - `stores/packStore.ts` contains `from '../services/packCache'` (line 13)
- Service web-path tests pass: `npx vitest run services/packCache.web.test.ts services/packIndex.web.test.ts services/questionProvider.web.test.ts` → 3 files, 34 tests, all passed.
- tsc error count trend: 28 lines (post-24-01) → 8 lines (post-24-02); all remaining errors are in test files, zero in production source touched by 24-02.

---
*Phase: 24-remove-native-build-path*
*Completed: 2026-07-18*