---
phase: 24-remove-native-build-path
verified: 2026-07-18T23:56:00Z
status: passed
score: 17/17 must-haves verified
overrides_applied: 0
---

# Phase 24: Remove Native Android/iOS Build Path — Verification Report

**Phase Goal:** Remove the native (Android/iOS) build path and the WatermelonDB native database layer, collapsing the app to a single web/PWA target. Delete `database/`, `services/packDownloader.ts`, native platform extensions, and `Platform.OS` branches across stores/services/UI. Remove `@nozbe/watermelondb` and `@react-native-async-storage/async-storage` deps, `android`/`ios` blocks from `app.config.js`, `android`/`ios` npm scripts, android icon assets, empty `dist-ios/`. Simplify `metro.config.js` and `babel.config.js`. Rewrite `questionStore.test.ts` + `packStore.test.ts` for the web path; update `__mocks__/react-native.ts` to `Platform.OS = 'web'`. Update README to web/PWA-only. Gates: full test suite green, `tsc --noEmit` clean, `pnpm build:web` succeeds.
**Verified:** 2026-07-18T23:56:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths / Must-Haves

| # | Must-Have | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `apps/mobile/database/` does not exist | ✓ VERIFIED | `ls apps/mobile/database` → "No such file or directory" |
| 2 | `apps/mobile/services/packDownloader.ts` does not exist | ✓ VERIFIED | `ls` → "No such file or directory" |
| 3 | `apps/mobile/services/platformStorage.native.ts` does not exist | ✓ VERIFIED | `ls` → "No such file or directory" |
| 4 | Android icon assets removed (`assets/android-icon-*.png`) | ✓ VERIFIED | `ls apps/mobile/assets \| grep -i android` → no matches |
| 5 | `apps/mobile/dist-ios/` does not exist | ✓ VERIFIED | `ls apps/mobile/dist-ios` → "No such file or directory" |
| 6 | `@nozbe/watermelondb` NOT in `apps/mobile/package.json` | ✓ VERIFIED | Not present in dependencies or devDependencies (package.json lines 14–45) |
| 7 | `@react-native-async-storage/async-storage` NOT in `package.json` | ✓ VERIFIED | Not present in dependencies or devDependencies |
| 8 | `app.config.js` has no `ios:`/`android:` blocks (web retained) | ✓ VERIFIED | Only `web: { ... }` block present (lines 16–20); no `ios`/`android` keys |
| 9 | `package.json` has no `android`/`ios` scripts; `start` is web-only | ✓ VERIFIED | `"start": "expo start --web"` (line 7); no `android`/`ios` script entries |
| 10 | `metro.config.js` has no native-mock resolver (`resolveRequest`) | ✓ VERIFIED | File is 12 lines; uses `getDefaultConfig` only, no `resolver.resolveRequest` override |
| 11 | `babel.config.js` has no WatermelonDB decorator plugins | ✓ VERIFIED | Plugins array contains only `@tamagui/babel-plugin` and `react-native-reanimated/plugin`; no `@babel/plugin-proposal-decorators` or `@babel/plugin-transform-class-properties` |
| 12 | `__mocks__/react-native.ts` sets `Platform.OS = 'web'` | ✓ VERIFIED | `export const Platform = { OS: 'web' as const };` (line 5) |
| 13 | No production source (excluding node_modules/dist/__mocks__) contains `Platform.OS` / `watermelondb` / imports from `database/` | ✓ VERIFIED | Code-wide grep returns only comment-level mentions in `metro.config.js`, `types/game.ts`, `stores/playerStore.ts`, `services/platformStorage.ts` — all in JSDoc comments; zero code-level usages. (One false-positive trivia answer text "Platform 9 3/4" in `data/questions/world-outside.ts`.) |
| 14 | README reflects web/PWA-only (no WatermelonDB, no pnpm ios/android, no database/) | ✓ VERIFIED | README line 5: "A web/PWA trivia game"; line 16: "Offline-First PWA"; line 183: "web-only — native build path removed in v12.0"; line 227: "Storage: IndexedDB (idb-keyval) + sessionStorage (offline-first web)". No `pnpm ios`/`pnpm android`/WatermelonDB mentions. |
| 15 | Gate 1: `npx vitest run` exits 0 | ✓ VERIFIED | 14 test files, 433 tests, all passed (1.18s) — exit 0 |
| 16 | Gate 2: `npx tsc --noEmit` exits 0 | ✓ VERIFIED | Command exited 0 with no output |
| 17 | Gate 3: `pnpm build:web` exits 0 and produces `apps/mobile/dist/` | ✓ VERIFIED | Exit 0; `dist/` contains `index.html`, `sw.js`, `sw.js.map`, `workbox-*.js`, `manifest.webmanifest`, `_redirects`, `_headers`, `apple-touch-icon.png`, `icons/`, `api/`, `packs/`, `statusz.json`, `metadata.json`, `assets/`, `_expo/`. SW log: "SW: precached 7 files (3302.5 KB total)" |

**Score:** 17/17 must-haves verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `apps/mobile/package.json` | Native deps + scripts removed | ✓ VERIFIED | `@nozbe/watermelondb` and `@react-native-async-storage/async-storage` absent; `start` is `expo start --web`; no `ios`/`android` scripts |
| `apps/mobile/app.config.js` | `ios`/`android` blocks removed | ✓ VERIFIED | Only `web` block + commented-out plugin list remain |
| `apps/mobile/metro.config.js` | Native-mock resolver dropped | ✓ VERIFIED | Bare `getDefaultConfig(__dirname)`; no `resolveRequest` |
| `apps/mobile/babel.config.js` | Decorator plugins dropped | ✓ VERIFIED | Only Tamagui + Reanimated plugins |
| `apps/mobile/__mocks__/react-native.ts` | `Platform.OS = 'web'` | ✓ VERIFIED | Confirmed |
| `apps/mobile/services/packCache.ts` | Static shim to `packCache.web` | ✓ VERIFIED | Per code-review LO review: clean static re-export shim |
| `apps/mobile/stores/questionStore.test.ts` | Rewritten for web path | ✓ VERIFIED | Passes; mocks `./packStore` and `../services/questionProvider.getNextQuestion` against real exported API |
| `apps/mobile/stores/packStore.test.ts` | Rewritten for web path | ✓ VERIFIED | Passes; mocks `../services/packCache` with 6-function surface; exercises real streaming download body |
| `README.md` | Web/PWA-only | ✓ VERIFIED | See must-have 14 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `stores/packStore.ts` | `services/packCache` | static import | ✓ WIRED | packCache shim re-exports web implementation |
| `stores/questionStore.ts` | `services/questionProvider` | static import | ✓ WIRED | IDB-first `getNextQuestionFromBundle` is sole path |
| `services/packIndex.ts` | IDB + offline fallback | inline | ✓ WIRED | `setCachedPackIndex` fire-and-forget preserved |
| `app.config.js` | `web` block only | direct export | ✓ WIRED | No native platform branches |
| `package.json` `build:web` | `dist/` + SW precache | shell pipeline | ✓ WIRED | Build produced dist with SW precache (7 files) |

### Data-Flow Trace (Level 4)

Not applicable — Phase 24 is an infrastructure/removal phase. No new dynamic-data rendering artifacts were introduced; the surviving web-path data flow (IDB → packCache.web → packStore → UI) was already verified in prior phases and re-confirmed green via the test suite (433 passing) and `pnpm build:web`.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full test suite green | `cd apps/mobile && npx vitest run` | 433 passed / 433 | ✓ PASS |
| Type-check clean | `cd apps/mobile && npx tsc --noEmit` | exit 0 | ✓ PASS |
| Web build produces dist + SW | `cd apps/mobile && pnpm build:web` | exit 0; dist/ with sw.js, sw.js.map, workbox-*.js, manifest.webmanifest, statusz.json; "SW: precached 7 files (3302.5 KB total)" | ✓ PASS |
| No native refs in production source | `grep -rn "Platform.OS\|watermelondb\|from.*database\|AsyncStorage"` | Only comment-level mentions in 4 files | ✓ PASS |
| Native artifacts gone | `ls apps/mobile/{database,dist-ios,services/packDownloader.ts,services/platformStorage.native.ts}` | All "No such file or directory" | ✓ PASS |

### Requirements Coverage

Phase 24 is an infrastructure removal phase; its requirements are the must-haves above. All 17 verified. No orphaned requirements from `.planning/REQUIREMENTS.md` mapped to Phase 24 beyond the goal statement.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `apps/mobile/services/platformStorage.ts` | 4–7 | Stale comment referencing deleted `platformStorage.native.ts` (LO-01 from code review) | ℹ️ Info | Documentation-only; no runtime impact |
| `apps/mobile/app/packs/index.tsx` | 90–96 | Dead `setDownloadedPackVersions({})` effect (LO-02 from code review) | ℹ️ Info | Inert code; documented as intended collapse pattern; no runtime impact |
| `apps/mobile/types/game.ts` | 28 | JSDoc mentions "AsyncStorage mobile" | ℹ️ Info | Comment-only; no code impact |
| `apps/mobile/stores/playerStore.ts` | 25 | JSDoc mentions "AsyncStorage mobile" | ℹ️ Info | Comment-only; no code impact |

No blockers, no stubs, no production code references to removed native modules. The two LOW findings from `24-REVIEW.md` are cosmetic comment/dead-code issues that do not affect the phase goal.

### Human Verification Required

One optional manual PWA smoke test (the build producing `dist/` + SW precache is the automated proxy, so this is informational, not blocking):

1. **PWA browser smoke test**
   - **Test:** Serve `apps/mobile/dist/` via a static server (e.g. `npx serve dist`), open in Chrome, register the service worker, then toggle offline in DevTools and reload.
   - **Expected:** App shell loads from SW precache; offline load succeeds; SW registration shows "activated" in Application → Service Workers.
   - **Why human:** Real-browser SW registration and offline-load behavior cannot be verified programmatically without a headed browser harness. The automated gate (`pnpm build:web` → `dist/sw.js` + "SW: precached 7 files") is the proxy.

This item is informational; the phase's automated gates (all three green) are the binding success criteria, so it does not block `status: passed`.

### Gaps Summary

No gaps. All 17 must-haves verified against the live codebase:

- All targeted native artifacts are gone (`database/`, `services/packDownloader.ts`, `services/platformStorage.native.ts`, `dist-ios/`, android icon assets).
- Both native-only dependencies (`@nozbe/watermelondb`, `@react-native-async-storage/async-storage`) removed from `package.json`.
- `app.config.js`, `metro.config.js`, `babel.config.js`, `__mocks__/react-native.ts` all collapsed to the web-only path.
- `package.json` scripts are web-only (`start` → `expo start --web`; no `ios`/`android` scripts).
- No production source contains code-level references to `Platform.OS`, `watermelondb`, `packDownloader`, or `database/` imports (only stale JSDoc comments, flagged as non-blocking info).
- README reflects web/PWA-only deployment.
- All three gates green: `npx vitest run` → 433/433 passed; `npx tsc --noEmit` → exit 0; `pnpm build:web` → exit 0 with `dist/` containing `sw.js`, precache manifest, PWA assets.

The two LOW-severity findings from `24-REVIEW.md` (stale `platformStorage.ts` comment, dead `setDownloadedPackVersions` effect) are cosmetic and do not affect the phase goal; they can be addressed in a future cleanup pass.

---

_Verified: 2026-07-18T23:56:00Z_
_Verifier: Claude (gsd-verifier)_