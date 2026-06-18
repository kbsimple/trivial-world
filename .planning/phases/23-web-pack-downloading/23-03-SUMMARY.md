---
phase: 23-web-pack-downloading
plan: "03"
subsystem: services/question-provider+pack-index
tags:
  - indexeddb
  - idb-keyval
  - offline
  - web
  - question-provider
  - pack-index
dependency_graph:
  requires:
    - packCache.ts (platform shim — Plan 01)
    - packCache.web.ts (idb-keyval implementation — Plan 01)
  provides:
    - IDB-first question fetching on web (questionProvider.ts)
    - IDB offline fallback for pack index (packIndex.ts)
  affects:
    - apps/mobile/services/questionProvider.ts
    - apps/mobile/services/packIndex.ts
tech_stack:
  added: []
  patterns:
    - IDB-first cache check before network fetch (questionProvider.ts)
    - IDB write-through after successful fetch (both services)
    - Platform.OS guard + dynamic import('./packCache.web') in packIndex.ts
    - vi.hoisted() for mock variables referenced in vi.mock() factories
key_files:
  created:
    - apps/mobile/services/questionProvider.web.test.ts (7 tests)
    - apps/mobile/services/packIndex.web.test.ts (8 tests)
  modified:
    - apps/mobile/services/questionProvider.ts
    - apps/mobile/services/packIndex.ts
decisions:
  - "packIndex.ts uses dynamic import('./packCache.web') directly (not the packCache.ts shim) to avoid synchronous require() issues in non-web test/server contexts where Platform.OS is 'ios' — the dynamic import is behind a Platform.OS === 'web' guard so it is never executed on native"
  - "questionProvider.ts imports from packCache.ts shim (not packCache.web directly) because the shim returns typed no-op stubs on native, keeping the native code path completely unchanged"
  - "vi.hoisted() used in packIndex.web.test.ts to declare mockPlatform before vi.mock() factory execution — required because vi.mock() is hoisted to the top of the file, before variable declarations"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-18"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
---

# Phase 23 Plan 03: Wire Pack Cache into Data-Fetch Services Summary

**One-liner:** IDB-first question fetching and offline-capable pack index in two service files, deleting the in-memory webPackCache Map, backed by 15 unit tests.

## What Was Built

### questionProvider.ts

Replaced the in-memory `webPackCache = new Map<string, Question[]>()` with IDB-first fetching:

1. Added top-level import: `import { getCachedPackQuestions, setCachedPackQuestions } from './packCache';`
2. Rewrote `fetchWebPackQuestions`:
   - Call `getCachedPackQuestions(packId)` first — returns on hit (no network call)
   - On miss: fetch from network, Zod-validate, call `setCachedPackQuestions(packId, questions)` before returning
   - On fetch failure: return null (caller falls back to `ALL_QUESTIONS`)

The `webPackCache` Map is completely removed. Questions now survive page reloads.

### packIndex.ts

Added Platform import and IDB integration:

1. Added `import { Platform } from 'react-native'` at top of file
2. In the `try` block after `validPacks` is assembled: dynamic `import('./packCache.web')` inside `Platform.OS === 'web'` guard, then `await setCachedPackIndex(validPacks)`
3. In the `catch` block: `Platform.OS === 'web'` guard, dynamic `import('./packCache.web')`, `getCachedPackIndex()` — returns cached value if available; otherwise falls through to `console.error` + `throw error`

Native path is completely unchanged. The pack list survives page reloads and works offline after first visit.

### Tests

**questionProvider.web.test.ts (7 tests):**
- IDB cache hit: no fetch called, setCachedPackQuestions not called
- IDB cache miss + network success: fetch called, setCachedPackQuestions called with fetched questions
- IDB cache miss + network failure: returns null, setCachedPackQuestions not called
- getCachedPackQuestions called on every invocation (no in-memory short-circuit)

**packIndex.web.test.ts (8 tests):**
- Success path: setCachedPackIndex called with validated packs; not called on native
- Failure path: IDB cache served without throw (web); throw when no IDB cache; throw on native; getCachedPackIndex not called on native

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.mock() hoisting reference error in packIndex.web.test.ts**
- **Found during:** Task 2 GREEN phase — `const mockPlatform = { OS: 'web' }` declared before `vi.mock('react-native', ...)` in source order, but vitest hoists `vi.mock()` calls to top of file before any `const` declarations. The factory function referencing `mockPlatform` threw `ReferenceError: Cannot access 'mockPlatform' before initialization`.
- **Fix:** Used `vi.hoisted()` to declare `mockPlatform` — `vi.hoisted()` is also hoisted by vitest, before `vi.mock()` factories run.
- **Files modified:** `apps/mobile/services/packIndex.web.test.ts`
- **Commits:** bc62d08

**2. [Rule 1 - Bug] Fixed vi.mock() hoisting reference error in questionProvider.web.test.ts**
- **Found during:** Task 1 GREEN phase — same hoisting issue with `mockGetCachedPackQuestions`/`mockSetCachedPackQuestions` declared as top-level `const` variables referenced inside `vi.mock('./packCache', ...)` factory.
- **Fix:** Moved mock functions inline in the factory (`vi.fn()` directly), imported the mocked module and aliased with `vi.mocked()` for reset/assertion.
- **Files modified:** `apps/mobile/services/questionProvider.web.test.ts`
- **Commits:** a237013

## Known Stubs

None. Both services are fully wired. IDB reads/writes go to the real idb-keyval store on web.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary changes beyond what the plan's threat model covers. Data written to IDB is Zod-validated before storage (same-origin, no external attacker access).

## TDD Gate Compliance

Both tasks were written with test files and implementation together, then verified with `pnpm --filter mobile test` from the main repo (386 tests passing: 371 baseline + 7 questionProvider + 8 packIndex). The worktree architecture requires test verification via temporary copy to the main repo for test runner access — a known constraint of parallel worktree execution without per-worktree `node_modules`.

## Self-Check: PASSED

| Item | Result |
|------|--------|
| `apps/mobile/services/questionProvider.ts` (webPackCache removed) | FOUND |
| `apps/mobile/services/questionProvider.web.test.ts` | FOUND |
| `apps/mobile/services/packIndex.ts` (Platform + IDB calls) | FOUND |
| `apps/mobile/services/packIndex.web.test.ts` | FOUND |
| `.planning/phases/23-web-pack-downloading/23-03-SUMMARY.md` | FOUND |
| Commit `a237013` (Task 1) | FOUND |
| Commit `bc62d08` (Task 2) | FOUND |
