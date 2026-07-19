---
phase: 24-remove-native-build-path
status: findings
reviewed_commits: 4341824..c588fbb
reviewed: 2026-07-18
depth: standard
files_reviewed: 13
files_reviewed_list:
  - apps/mobile/services/packCache.ts
  - apps/mobile/services/packIndex.ts
  - apps/mobile/services/questionProvider.ts
  - apps/mobile/stores/packStore.ts
  - apps/mobile/stores/questionStore.ts
  - apps/mobile/app/index.tsx
  - apps/mobile/app/_layout.tsx
  - apps/mobile/app/game/_layout.tsx
  - apps/mobile/app/game/setup.tsx
  - apps/mobile/app/packs/index.tsx
  - apps/mobile/app/packs/combos.tsx
  - apps/mobile/components/PauseOverlay.tsx
  - apps/mobile/utils/haptics.ts
  - apps/mobile/stores/packStore.test.ts
  - apps/mobile/stores/questionStore.test.ts
  - apps/mobile/services/platformStorage.ts
findings:
  blocker: 0
  high: 0
  medium: 0
  low: 2
  info: 0
  total: 2
---

# Phase 24: Code Review Report

**Reviewed:** 2026-07-18
**Depth:** standard
**Commits:** 4341824..c588fbb
**Status:** findings (2 LOW — documentation/dead-code, no correctness or security defects)

## Summary

Reviewed the surviving production source and test rewrites from Phase 24
(remove native build path / collapse to web/PWA-only). Cross-referenced each
collapsed file against its pre-24-02 version (commit 4341824) to verify the
web branch was inlined verbatim and no web-path side effect was dropped.

**The collapse is correct.** Specifically:

- **services/packCache.ts** — clean static `export ... from './packCache.web'`
  shim; every function the store imports is re-exported with the exact name
  the underlying web module declares.
- **services/packIndex.ts** — IDB write-through + offline fallback inlined
  as the sole path; the catch-block `console.error` + rethrow and the
  `setCachedPackIndex` fire-and-forget are preserved.
- **services/questionProvider.ts** — IDB-first `getNextQuestionFromBundle`
  is the sole implementation; `logger.debug` is still imported and used; the
  `Platform` import and both `Q` dynamic-import blocks are gone.
- **stores/packStore.ts** — `selectPack` / `selectPackList` correctly drop
  `setActivePack`; persistence of `activePackId` is preserved via zustand
  persist's `partialize` (line 234), so no side effect is lost.
  `downloadPackForOffline`'s streaming-download body is byte-identical to
  the pre-24-02 web branch (only the dynamic `await import('./packCache.web')`
  was replaced by a static top-level import). `downloadPack` delegation and
  the `refreshDownloadedPacks` no-op match the post-24-02 packCache API.
- **stores/questionStore.ts** — all four actions (selectQuestion, markAsked,
  unmarkAsked, resetAskedQuestions) inline the pre-24-02 web branch exactly.
- **app/_layout.tsx, app/index.tsx, app/game/_layout.tsx, app/game/setup.tsx,
  components/PauseOverlay.tsx, utils/haptics.ts, app/packs/index.tsx,
  app/packs/combos.tsx** — each collapse matches the pre-24-02 web branch:
  - `app/_layout.tsx`: web already rendered immediately pre-24-02
    (`useState(Platform.OS === 'web')`); post-24-02 renders immediately —
    no behavior change.
  - `app/index.tsx`: pack-name lookup via `availablePacks.find` matches the
    pre-24-02 web branch; the unconditional `setTimeout` redirect matches
    the pre-24-02 web behavior.
  - `app/game/_layout.tsx`: the BackHandler effect was a no-op on web
    pre-24-02 (`if (Platform.OS === 'web') return`); removal is equivalent.
    Header label `'☰'` matches the pre-24-02 web ternary.
  - `app/packs/index.tsx`: `isDownloaded` local var is `true` (matches
    pre-24-02 web `isNativeDownloaded || Platform.OS === 'web'`); the
    `DownloadProgress` render condition `{isDownloading && ...}` matches
    the pre-24-02 web condition (where `Platform.OS === 'web'` made the
    `selectedPack ||` clause always true); the retry alert's
    `handleDownloadForOffline` call matches the pre-24-02 web branch.
- **stores/packStore.test.ts** — mocks the canonical `../services/packCache`
  shim with the exact 6-function surface the store imports; the
  `downloadPackForOffline` describe block exercises the real streaming
  download body with a fetch mock; the `downloadPack` delegation test stubs
  the store's own action via `setState` to isolate the delegation assertion.
  Mocks target the REAL exported API (T-24-06 mitigation satisfied).
- **stores/questionStore.test.ts** — mocks `./packStore` (provides
  `usePackStore.getState` with `activePackId` / `enabledDifficulties`) and
  `../services/questionProvider.getNextQuestion`; asserts the store
  forwards `(category, askedQuestionIds, packIds, difficulty,
  enabledDifficulties)` correctly and updates state on hit/miss. Mocks
  target the REAL exported API (T-24-06 mitigation satisfied).

**Verified gates:** `npx tsc --noEmit` → exit 0 (re-run during review).
The phase's documented vitest 433/433 and `pnpm build:web` gates were
recorded in 24-03-SUMMARY and not re-run here.

**No leftover native references in production source.** Codebase-wide grep
for `Platform.OS`, `@nozbe/watermelondb`, `@react-native-async-storage`,
`packDownloader`, and `from '../database'` / `'../../database'` returns
zero matches outside test files and mock comments.

Only two LOW-severity cosmetic/documentation issues survive the collapse;
neither affects runtime correctness.

## Low

### LO-01: Stale comment references deleted `platformStorage.native.ts`

**File:** `apps/mobile/services/platformStorage.ts:4-7`
**Issue:** The file header comment still says:

```
NOTE: This file is used ONLY on web. React Native uses platformStorage.native.ts
which imports AsyncStorage. This separation prevents bundling native modules on web.
```

`platformStorage.native.ts` was deleted in 24-01 and AsyncStorage was
removed from `package.json`. The comment is now factually wrong and would
mislead a future maintainer into searching for a native sibling file that
does not exist.

**Fix:** Replace the comment with a web/PWA-only note, e.g.:

```ts
/**
 * Web/PWA storage adapter for zustand persist.
 * Uses sessionStorage for session-only persistence (D-06).
 * Web/PWA-only (Phase 24-01): the native AsyncStorage adapter was removed
 * when the native build path was deleted; this is the sole storage adapter.
 */
```

### LO-02: Dead `setDownloadedPackVersions` effect in `app/packs/index.tsx`

**File:** `apps/mobile/app/packs/index.tsx:90-96`
**Issue:** The effect

```ts
useEffect(() => {
  setDownloadedPackVersions({});
}, [downloadedPackIds]);
```

is now dead code: `downloadedPackIds` is always `[]` post-collapse (the
store's `refreshDownloadedPacks` is a no-op and `downloadPack` no longer
populates it), so the dependency never changes and the effect runs exactly
once on mount to set state that is already `{}`. `checkHasUpdateAvailable`
(line 225-239) consequently always returns false, and the
`downloadedPackVersions` state is never read meaningfully.

This is documented in 24-02-SUMMARY as the intended collapse pattern
("downloadedPackVersions stays empty"), so it is not a regression — but
the effect + state + `checkHasUpdateAvailable` function are now
permanently-inert code that a future reader has to reason about.

**Fix:** If a follow-up cleanup is desired, remove:
- `downloadedPackVersions` state (line 57)
- the `setDownloadedPackVersions({})` effect (lines 94-96)
- `checkHasUpdateAvailable` (lines 225-239)
- the `hasUpdate` prop usage at line 307 (and the `hasUpdateAvailable`
  import if no other caller)

and replace `PackCard`'s `hasUpdate` with `false` (or drop the prop if the
component allows). This is a non-blocking cleanup; leaving it as-is is
safe.

---

_Reviewed: 2026-07-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_