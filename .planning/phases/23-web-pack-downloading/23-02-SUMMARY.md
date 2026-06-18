---
phase: 23-web-pack-downloading
plan: "02"
subsystem: web-pwa
tags: [service-worker, workbox, pwa, offline, build-tooling]
dependency_graph:
  requires: []
  provides:
    - apps/mobile/public/sw-template.js
    - apps/mobile/scripts/build-sw.mjs
    - SW registration in apps/mobile/public/index.html
    - idb-keyval 6.2.5, workbox-window 7.4.1, workbox-build 7.4.1
  affects:
    - apps/mobile/package.json (build scripts + new deps)
    - apps/mobile/public/index.html (SW registration before </body>)
tech_stack:
  added:
    - idb-keyval@6.2.5 (dep)
    - workbox-window@7.4.1 (dep)
    - workbox-build@7.4.1 (devDep)
  patterns:
    - workbox-build injectManifest as post-build Node ESM script
    - Workbox CDN registration via type="module" script in index.html
    - silent-update pattern: waiting -> messageSkipWaiting, controlling -> reload
key_files:
  created:
    - apps/mobile/public/sw-template.js
    - apps/mobile/scripts/build-sw.mjs
  modified:
    - apps/mobile/package.json
    - apps/mobile/public/index.html
decisions:
  - id: CDN-registration
    choice: "workbox-window via CDN in index.html, not npm import in app bundle"
    rationale: "SW registration must run before RN polyfills lock window.fetch and window.performance; CDN script in index.html body avoids Metro bundling workbox-window into the main app bundle"
  - id: injectManifest-not-generateSW
    choice: "workbox-build injectManifest"
    rationale: "generateSW auto-generates a navigation catch-all that may conflict with Expo Router's SPA redirect pattern; injectManifest lets us write the SW template with full control"
  - id: packs-excluded-from-precache
    choice: "packs/** and api/** in globIgnores"
    rationale: "Pack bodies go to IndexedDB (plan 23-04/05), not SW Cache API; mitigates T-23-02-02 elevation of privilege by keeping pack data out of SW scope"
metrics:
  duration: "~3m"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
  completed_date: "2026-06-18"
---

# Phase 23 Plan 02: Service Worker Layer Summary

Workbox SW template, post-build injection script, index.html registration, and idb-keyval/workbox npm deps — giving the app shell and pack index route offline capability via precache and StaleWhileRevalidate.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Install deps + create SW template + build script | 782b702 | package.json, pnpm-lock.yaml, sw-template.js, build-sw.mjs |
| 2 | Add SW registration script to index.html | 37f362d | index.html |

## What Was Built

**apps/mobile/public/sw-template.js**
- Workbox SW source with `precacheAndRoute(self.__WB_MANIFEST)` for app shell
- `NavigationRoute` handler so all navigations serve precached `/index.html` (SPA pattern)
- `StaleWhileRevalidate` for `/api/v1/packs.json` (pack index served from cache, updated in background)
- `SKIP_WAITING` message handler for silent SW updates

**apps/mobile/scripts/build-sw.mjs**
- Post-build Node ESM script using `workbox-build injectManifest`
- Globs `dist/` for app shell files: `index.html`, `_expo/static/js/web/*.js`, icons, manifest, favicon
- `dontCacheBustURLsMatching: /[0-9a-f]{8,}\./` — Metro produces content-hashed filenames, prevents redundant query param
- `globIgnores: ['packs/**', 'api/**', ...]` — pack bodies excluded from SW precache (handled by IndexedDB in later plans)
- Appended as final step in both `build` and `build:web` scripts in package.json

**apps/mobile/public/index.html (modified)**
- Added `<script type="module">` before `</body>` (after `<div id="root">`)
- Imports `Workbox` from googleapis CDN workbox-window 7.4.0
- `waiting` listener: `messageSkipWaiting()` — activates new SW immediately on install
- `controlling` listener: `window.location.reload()` — picks up new cached assets once SW takes control

**apps/mobile/package.json (modified)**
- `"idb-keyval": "6.2.5"` in dependencies
- `"workbox-window": "7.4.1"` in dependencies
- `"workbox-build": "7.4.1"` in devDependencies
- Both `build` and `build:web` scripts end with `&& node scripts/build-sw.mjs`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Built @trivial-world/types package to fix pre-existing test failures**
- **Found during:** Task 1 test gate verification
- **Issue:** `packages/types/dist/` was missing from the worktree (the build artifact is gitignored). 4 test files (`packAssets.test.ts`, `packComboSchema.test.ts`, `questionSchema.test.ts`, `packIndex.test.ts`) failed with "Failed to resolve entry for package @trivial-world/types".
- **Fix:** Ran `npx tsc` in `packages/types/` to generate `dist/`. All 349 tests now pass.
- **Scope:** Pre-existing issue in this worktree (base commit also had 4 failures); fixing it was required by CLAUDE.md "No Known Broken Tests" rule.
- **Files modified:** `packages/types/dist/` (generated, gitignored — not committed)

## Threat Model Coverage

| Threat | Disposition | Implementation |
|--------|-------------|----------------|
| T-23-02-02 (Elevation of Privilege: SW precache scope) | mitigated | `globIgnores: ['packs/**', 'api/**']` in build-sw.mjs — pack JSONs never enter SW Cache API |
| T-23-02-03 (DoS: SW update reload loop) | mitigated | `controlling` event fires once per SW update cycle (standard Workbox pattern), not on every page load |
| T-23-02-01 (Tampering: CDN workbox-window) | accepted | No SRI hash added — per threat model disposition. CDN unavailable = SW never registers but app works online. |

## Known Stubs

None — this plan creates build infrastructure only. No UI rendering, no data flow stubs.

## Self-Check: PASSED

Checked files exist:
- [x] apps/mobile/public/sw-template.js — FOUND
- [x] apps/mobile/scripts/build-sw.mjs — FOUND
- [x] apps/mobile/public/index.html contains `workbox-window.prod.mjs` — FOUND

Checked commits exist:
- [x] 782b702 — FOUND (feat(23-02-01))
- [x] 37f362d — FOUND (feat(23-02-02))

Tests: 349 passing, 0 failing.
