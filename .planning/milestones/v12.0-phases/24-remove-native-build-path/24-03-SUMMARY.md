---
phase: 24-remove-native-build-path
plan: 03
subsystem: testing
tags: [vitest, tsc, expo-web, pwa, idb-keyval, zustand-persist, readme]

# Dependency graph
requires:
  - phase: 24-remove-native-build-path (plan 02)
    provides: Production source collapsed to the web/PWA-only path; packStore rewired to the packCache IDB shim; questionStore inlined web branches; no Platform.OS conditionals or dynamic WatermelonDB imports in production code.
provides:
  - Web/PWA-only test coverage for stores/packStore.test.ts and stores/questionStore.test.ts (mock the post-24-02 packCache + questionProvider APIs; assert zustand persist on platformStorage/sessionStorage)
  - No remaining vi.mock('@nozbe/watermelondb') or vi.mock('@react-native-async-storage/async-storage') in any test file
  - README.md updated to web/PWA-only deployment (no iOS/Android, no WatermelonDB, no database/ in Project Structure)
  - pnpm-lock.yaml pruned (11 packages removed: @nozbe/watermelondb + @react-native-async-storage/async-storage transitive set)
  - Three phase gates green: vitest 433/433, tsc --noEmit exit 0, pnpm build:web exit 0 with dist/ produced
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Store tests mock the packCache shim (not packCache.web.ts) and the questionProvider service — single canonical mock surface matching post-collapse production imports"
    - "Store tests rely on vitest's jsdom sessionStorage for zustand persist (no AsyncStorage mock) — platformStorage is the sole adapter"

key-files:
  created: []
  modified:
    - apps/mobile/stores/packStore.test.ts
    - apps/mobile/stores/questionStore.test.ts
    - apps/mobile/stores/playerStore.test.ts
    - apps/mobile/stores/gameStore.test.ts
    - apps/mobile/services/packCache.web.test.ts
    - apps/mobile/services/packIndex.web.test.ts
    - README.md
    - pnpm-lock.yaml

key-decisions:
  - "Mocked packCache (the shim) rather than packCache.web.ts in packStore.test.ts — matches packStore's post-24-02 import path ('../services/packCache') and avoids the dual-mock that previously required also mocking packCache.web."
  - "For the downloadPack delegation test, replaced the store's downloadPackForOffline action with a stub via usePackStore.setState to assert only the delegation (the full IDB streaming-download body is already covered by the downloadPackForOffline describe block, which sets its own global.fetch)."
  - "Questionstore tests mock questionProvider.getNextQuestion directly and assert the store delegates correctly (category, excludeIds, packIds, difficulty, enabledDifficulties) — no WatermelonDB Q/database mocks needed."
  - "Fixed two pre-existing test-data type mismatches flagged by 24-02 (packCache.web.test.ts:90 category string vs Category literal; packIndex.web.test.ts mockPackEntry had stale schema fields description/questionCount/categories/difficulty/tags/createdAt/updatedAt) so the tsc gate is fully clean (exit 0, 0 errors) — not just 'no new errors'."
  - "Did NOT touch the pre-existing local modification to apps/mobile/.tamagui/tamagui.config.json (left alone across 24-01/24-02/24-03). The web build succeeded despite it, so it was not surfaced."
  - "pnpm install pruned 11 packages from the lockfile (the @nozbe/watermelondb + @react-native-async-storage/async-storage transitive set that 24-01 removed from package.json but deferred lockfile-pruning to this plan)."

patterns-established:
  - "Web/PWA-only test surface: store tests mock the canonical service shim and use jsdom sessionStorage for persist — no native storage mocks anywhere"

requirements-completed:
  - GOAL-rewrite-questionStore-test-web-path
  - GOAL-rewrite-packStore-test-web-path
  - GOAL-update-readme-web-pwa-only
  - GOAL-gate-vitest-green
  - GOAL-gate-tsc-clean
  - GOAL-gate-build-web-succeeds

# Metrics
duration: ~15min
completed: 2026-07-18
---

# Phase 24 Plan 03: Rewrite Stores Tests for Web/PWA-only + Run Phase Gates Summary

**Rewrote the four store test files for the post-24-02 web/PWA-only path (packCache IDB shim + questionProvider + zustand persist on sessionStorage), updated README to web/PWA-only, pruned the lockfile, and ran all three phase gates green: vitest 433/433, tsc --noEmit exit 0, pnpm build:web exit 0 with dist/ produced.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-18
- **Completed:** 2026-07-18
- **Tasks:** 2
- **Files modified:** 8 (4 store tests + 2 service test-data fixes + README + pnpm-lock.yaml)

## Accomplishments

- **Task 1 — stores/packStore.test.ts (full rewrite):** Removed the deleted `vi.mock('../services/packDownloader')`, `vi.mock('../services/packCache.web')`, and `vi.mock('@react-native-async-storage/async-storage')`. Replaced with a single `vi.mock('../services/packCache')` exposing the exact post-24-02 surface packStore imports (`getCachedPackChecksum`, `setCachedPackQuestions`, `setCachedPackChecksum`, `setCachedPackIndex`, `getOfflinePackIds`, `requestPersistentStorage`). Updated test cases for the post-collapse API: `downloadPack` delegates to `downloadPackForOffline` (stubbed assertion), `refreshDownloadedPacks` is a no-op, `selectPack`/`selectPackList` set state directly (no `setActivePack` call), added `selectPackList` coverage, and added a `store persistence (web platformStorage / sessionStorage)` describe block that reads back the persisted slice from `sessionStorage.getItem('trivial-world-packs')` and asserts transient fields (`isLoading`, `isDownloading`, `downloadProgress`) are NOT persisted. 59 tests pass.
- **Task 1 — stores/questionStore.test.ts (full rewrite):** Removed `vi.mock('../database')`, `vi.mock('@react-native-async-storage/async-storage')`, and all WatermelonDB Q/question-pack query mocks. Replaced with `vi.mock('./packStore')` (provides `activePackId` / `enabledDifficulties`) and `vi.mock('../services/questionProvider')` (controls `getNextQuestion` return value). Test cases assert the actual store API: `selectQuestion` forwards `(category, askedQuestionIds, packIds, difficulty, enabledDifficulties)` to `getNextQuestion`, sets `currentQuestion`/`currentCategory` on hit, returns null without mutating state on miss, resolves packIds from `activePackId` when none passed; `markAsked` appends to `askedQuestionIds` and returns true; `unmarkAsked` filters; `resetAskedQuestions` clears without affecting `currentQuestion`/`currentCategory`; persistence test reads back `trivial-world-questions` from sessionStorage and asserts the partialized slice. 41 tests pass.
- **Task 1 — stores/playerStore.test.ts & stores/gameStore.test.ts:** Deleted the single stale `vi.mock('@react-native-async-storage/async-storage', ...)` block from each. The web `platformStorage` uses sessionStorage (provided by vitest's jsdom environment); no replacement mock needed. Both files pass unchanged otherwise (92 + 36 tests).
- **Task 1 — codebase-wide grep verification:** No `vi.mock('@nozbe/watermelondb'`, no `vi.mock('@react-native-async-storage/async-storage'`, no `packDownloader`, no `from '../database'` in any `*.test.ts` / `*.test.tsx` under apps/mobile (excluding node_modules/dist).
- **Task 2 — README.md web/PWA-only:** Line 5 changed to "A web/PWA trivia game…"; Features line "Offline-First" → "Offline-First PWA: No network required for core gameplay after first load"; "Running the Apps" section collapsed to a single "Mobile App (Web/PWA)" subsection (removed `pnpm ios` / `pnpm android` / `pnpm web` lines and the iOS/Android header); Project Structure tree dropped the `database/` line and updated the `mobile/` comment to "Expo web/PWA app (web-only — native build path removed in v12.0)"; Tech Stack updated to "Mobile (Web/PWA): Expo SDK 56, React Native 0.85 (web export), React 19" and "Storage: IndexedDB (idb-keyval) + sessionStorage (offline-first web)" — WatermelonDB reference removed. Acceptance greps: `grep -c "WatermelonDB" README.md` = 0, `grep -c "pnpm ios\|pnpm android"` = 0, `grep -c "database/"` = 0.
- **Task 2 — pnpm install lockfile prune:** Ran `pnpm install --frozen-lockfile=false` at the repo root (pnpm monorepo with workspace). 11 packages pruned — the @nozbe/watermelondb + @react-native-async-storage/async-storage transitive set that 24-01 removed from apps/mobile/package.json but deferred lockfile-pruning to this plan.
- **Task 2 — Gate 1 (tests):** `cd apps/mobile && npx vitest run` → exit 0, 14 test files, 433 tests passed, 0 failed. No test files skipped or commented out.
- **Task 2 — Gate 2 (typecheck):** `cd apps/mobile && npx tsc --noEmit` → exit 0, 0 errors. (Pre-fix it reported 2 errors — both pre-existing test-data type mismatches flagged by 24-02; fixed inline as a Rule 1/Rule 2 auto-fix, see Deviations.)
- **Task 2 — Gate 3 (web build):** `cd apps/mobile && pnpm build:web` → exit 0, `dist/` produced (index.html, manifest.webmanifest, sw.js, sw.js.map, workbox-*, assets/, packs/, api/, statusz.json, _redirects, _headers, apple-touch-icon.png, icons/, metadata.json). SW precached 7 files (3302.5 KB total). No stale WatermelonDB import surfaced during the Expo web export.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite stores tests for the web/PWA-only path** — `05f7897` (test)
2. **Task 2: Update README to web/PWA-only; run phase gates** — `3f8441e` (docs)

## Files Created/Modified

- `apps/mobile/stores/packStore.test.ts` — full rewrite: mock the packCache shim (not packCache.web), assert post-24-02 web API (downloadPack delegation, no-op refreshDownloadedPacks, selectPack without setActivePack, selectPackList, IDB streaming-download, sessionStorage persistence)
- `apps/mobile/stores/questionStore.test.ts` — full rewrite: mock questionProvider.getNextQuestion, assert markAsked/unmarkAsked/resetAskedQuestions/selectQuestion against the in-memory askedQuestionIds + sessionStorage persistence
- `apps/mobile/stores/playerStore.test.ts` — deleted the stale async-storage mock (single line block); rest unchanged
- `apps/mobile/stores/gameStore.test.ts` — deleted the stale async-storage mock (single line block); rest unchanged
- `apps/mobile/services/packCache.web.test.ts` — fixed pre-existing TS2345 test-data type mismatch (category: 'blue' → 'blue' as const) for a fully clean tsc
- `apps/mobile/services/packIndex.web.test.ts` — fixed pre-existing TS2353 test-data mismatch (mockPackEntry rewritten to the actual PackIndexEntrySchema shape: id/name/author/version/totalQuestions/categoryCounts/downloadUrl/checksum/size; removed stale description/questionCount/categories/difficulty/tags/createdAt/updatedAt)
- `README.md` — web/PWA-only deployment documentation (Running the Apps, Project Structure, Tech Stack, Features)
- `pnpm-lock.yaml` — pruned 11 removed native-dependency packages

## Decisions Made

- **Mock the packCache shim, not packCache.web.ts:** packStore.ts post-24-02 imports from `'../services/packCache'` (the canonical re-export shim). Mocking the shim — not the underlying `.web.ts` module — matches production's import path and removes the dual-mock that previously required also mocking packCache.web. The shim is the single mock surface.
- **downloadPack delegation test via setState stub:** the post-24-02 `downloadPack` just calls `get().downloadPackForOffline(entry)`. Asserting delegation by spying on the store's own method would still run the real IDB streaming-download body (and trip a 404 from the un-mocked `global.fetch` in that describe block). Instead, the test stubs `downloadPackForOffline` on the store state with a `vi.fn().mockResolvedValue(undefined)`, asserts `downloadPack(entry)` called it with `entry`, then restores the original. The full IDB body is covered separately by the `downloadPackForOffline` describe block (which sets its own `global.fetch`).
- **questionStore test mocks questionProvider directly:** instead of building a fake WatermelonDB Q/pack query surface (now deleted), mock `getNextQuestion` and assert the store forwards the right arguments and updates state on the result. This is the post-24-02 reality: the store is a thin in-memory + persist layer over the questionProvider IDB-first path.
- **Fix the two pre-existing tsc test-data mismatches:** the plan said "ideally the suite is fully clean now". Both errors were in test files this phase did not author but are trivial test-data shape fixes (a `as const` on a category literal and a rewritten `mockPackEntry` to match the actual `PackIndexEntrySchema`). Fixing them gets Gate 2 to exit 0 with zero errors rather than "no new errors vs. baseline". This also aligns with CLAUDE.md ("No Known Broken Tests" / no unresolved errors in the repo).
- **Leave the .tamagui/tamagui.config.json local modification alone:** the orchestrator flagged it as pre-existing across 24-01/24-02. The web build succeeded with the modified file, so it was not surfaced or reverted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TS2345 in services/packCache.web.test.ts:92**
- **Found during:** Task 2 (Gate 2 — tsc --noEmit)
- **Issue:** The `questions` array literal had `category: 'blue'` inferred as `string`, not assignable to the `Category` literal union expected by `setCachedPackQuestions`. Pre-existing (flagged in 24-02 SUMMARY's deferred-items list).
- **Fix:** Changed the literal to `category: 'blue' as const`.
- **Files modified:** apps/mobile/services/packCache.web.test.ts
- **Verification:** `npx tsc --noEmit` exit 0, 0 errors; `npx vitest run services/packCache.web.test.ts` 22 tests pass.
- **Committed in:** `3f8441e` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed pre-existing TS2353 in services/packIndex.web.test.ts:59**
- **Found during:** Task 2 (Gate 2 — tsc --noEmit)
- **Issue:** The `mockPackEntry: PackIndexEntry` literal used the old pack-index schema (`description`, `questionCount`, `categories`, `difficulty`, `tags`, `createdAt`, `updatedAt`) that no longer matches `PackIndexEntrySchema` (which expects `author`, `totalQuestions`, `categoryCounts`, `size`). Pre-existing (flagged in 24-02 SUMMARY).
- **Fix:** Rewrote `mockPackEntry` to the actual `PackIndexEntrySchema` shape.
- **Files modified:** apps/mobile/services/packIndex.web.test.ts
- **Verification:** `npx tsc --noEmit` exit 0, 0 errors; `npx vitest run services/packIndex.web.test.ts` 5 tests pass.
- **Committed in:** `3f8441e` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 × Rule 1 bug — pre-existing test-data type mismatches fixed to satisfy the plan's "ideally the suite is fully clean now" Gate 2 directive)
**Impact on plan:** Both fixes are in test files this phase did not author, but they are trivial shape corrections that bring Gate 2 to a true exit 0. No scope creep.

## Issues Encountered

- The first run of the four store test files had one failure in the `downloadPack (delegates to downloadPackForOffline)` describe block: the spy-on-real-method approach still executed the real `downloadPackForOffline` body, which hit the un-mocked `global.fetch` (404). Resolved by stubbing the action via `usePackStore.setState({ downloadPackForOffline: stub })` for the delegation assertion only — the real body is covered by the dedicated `downloadPackForOffline` describe block which sets its own fetch.

## User Setup Required

None — pure test/docs/config work. No external services, no env vars.

## Next Phase Readiness

- Phase 24 is complete. The codebase is fully web/PWA-only:
  - No `@nozbe/watermelondb` or `@react-native-async-storage/async-storage` in production source or tests.
  - No `vi.mock('@nozbe/watermelondb')` or `vi.mock('@react-native-async-storage/async-storage')` in any test file.
  - No `packDownloader` references in test files.
  - No `database/` imports anywhere.
  - README documents the web/PWA-only deployment.
  - All three phase gates green: vitest 433/433, tsc --noEmit exit 0, pnpm build:web exit 0 (dist/ produced).
- The pre-existing local modification to `apps/mobile/.tamagui/tamagui.config.json` is left as-is (untouched across 24-01/24-02/24-03); the web build succeeds with it, so no action is needed.

## Known Stubs

None — this plan rewrote tests and docs; it introduces no stubbed data paths.

## Threat Flags

None. The trust boundary (IDB → zustand stores via `platformStorage` / `packCache`; sessionStorage → zustand persist) is unchanged; only the test mock surface and README documentation were updated. The threat-model mitigations (T-24-06 tests must use the actual post-24-02 API names; T-24-07 web build must not regress on a stale WatermelonDB import) are satisfied: the store tests mock the exact `packCache` shim surface `packStore` imports, and Gate 3 (`pnpm build:web`) exits 0 with no WatermelonDB bundler error.

## Self-Check: PASSED

- All 8 declared modified files exist on disk (verified via the Task 1 + Task 2 git commits `05f7897` and `3f8441e`).
- Both task commits present in git log: `05f7897` (Task 1 test rewrites) and `3f8441e` (Task 2 README + lockfile + test-data fixes).
- Task 1 acceptance greps pass:
  - `grep -rn -E "watermelondb|async-storage|packDownloader|from '\.\./database'" stores/packStore.test.ts stores/questionStore.test.ts stores/playerStore.test.ts stores/gameStore.test.ts` → exit 1 (no matches)
  - `grep -rn "vi.mock('@nozbe/watermelondb'" apps/mobile` (excluding node_modules/dist) → no matches
  - `grep -rn "vi.mock('@react-native-async-storage/async-storage'" apps/mobile` (excluding node_modules/dist) → no matches
- Task 2 acceptance greps pass:
  - `grep -c "WatermelonDB" README.md` → 0
  - `grep -c "pnpm ios\|pnpm android" README.md` → 0
  - `grep -c "database/" README.md` → 0
- Phase gates (final verification):
  - Gate 1: `npx vitest run` → exit 0, 14 files / 433 tests passed
  - Gate 2: `npx tsc --noEmit` → exit 0, 0 errors
  - Gate 3: `pnpm build:web` → exit 0, dist/ produced (index.html, sw.js, manifest.webmanifest, packs/, api/, statusz.json, icons/, _redirects, _headers, apple-touch-icon.png, metadata.json, workbox-*, assets/)

---
*Phase: 24-remove-native-build-path*
*Completed: 2026-07-18*