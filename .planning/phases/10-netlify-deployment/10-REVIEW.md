---
phase: 10-netlify-deployment
reviewed: 2026-06-11T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - netlify.toml
  - apps/generator/public/_redirects
  - apps/mobile/public/_redirects
  - .nvmrc
  - apps/mobile/package.json
  - playwright.config.ts
  - e2e/mobile.spec.ts
  - e2e/generator.spec.ts
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-06-11
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 10 adds Netlify deployment configuration, SPA redirect rules for both apps, Playwright E2E tests, and a `cp` step in the mobile build script to copy the `_redirects` file into the output directory. Overall the approach is sound: Turborepo orchestrates both apps, Next.js static export handles the generator, and Expo web export handles the mobile app. Security headers are present on both sites.

Several concrete issues are worth addressing before relying on these tests and configs in CI:

- The generator's `_redirects` file is in `apps/generator/public/` but its `next build` script does **not** copy it to `out/` (unlike the mobile app which explicitly `cp`s it). This means SPA routing will silently break on the generator's Netlify deployment.
- The root `netlify.toml` does not set a `publish` directory, so Netlify may deploy an empty site unless the per-site UI override is always set — a fragile dependency on manual Netlify UI configuration.
- The generator E2E test for "console errors" registers the listener **after** `beforeEach` has already navigated, meaning errors that fire during the initial page load are missed.
- Two `page.waitForTimeout(2000)` hardcoded waits will make the suite flaky under slow CI and mask races.
- The `@netlify/plugin-nextjs` is included in `apps/generator/netlify.toml` but its package is not declared in any `package.json` — this will fail silently or cause a build error on Netlify.

---

## Warnings

### WR-01: Generator `_redirects` never copied to output

**File:** `apps/generator/package.json:6` (build script) / `apps/generator/public/_redirects:1`

**Issue:** The mobile app explicitly runs `cp public/_redirects dist/_redirects` as part of its build script, but the generator's build script is just `next build`. Next.js static export copies files from `public/` into `out/` automatically **only** for files Next.js recognises (e.g. `robots.txt`, images). The `_redirects` file is a Netlify-specific artifact that Next.js does not copy. As a result, `apps/generator/out/_redirects` will be absent after a clean build, and the SPA routing tests (`/review`, `/packs` direct navigation) will fail in production even though they pass locally if an old `out/` is present.

**Fix:** Update `apps/generator/package.json`:
```json
"build": "next build && cp public/_redirects out/_redirects"
```
(Verify `out/` is created before the copy by confirming `next build` succeeds first — it always does before the `&&` step runs.)

---

### WR-02: Root `netlify.toml` missing `publish` directory — depends on Netlify UI config

**File:** `netlify.toml:16-19`

**Issue:** The `[build]` section sets only `command`; there is no `publish` key. The comments say "Publish directory set per-site in Netlify UI." This means the entire deployment is gated on a manual UI setting that is invisible in the repository. If a new team member clones the repo and creates a Netlify site from the repo root, Netlify defaults to publishing the repo root — resulting in an empty or incorrect deployment. The per-site UI override also breaks if the site is recreated or if Netlify resets to repo defaults.

**Fix:** For each app, use a dedicated `netlify.toml` in its subdirectory (the generator already has one at `apps/generator/netlify.toml`). The root `netlify.toml` should either be removed (if Netlify sites are configured from subdirectories) or should explicitly document the required UI settings more visibly, and ideally set the publish dir for the primary site:
```toml
[build]
  command = "pnpm install && pnpm build"
  publish = "apps/mobile/dist"
```

---

### WR-03: Generator E2E console-error test misses load-time errors

**File:** `e2e/generator.spec.ts:15-35`

**Issue:** The `beforeEach` at line 11–13 navigates to `/` before each test. The "should load without critical console errors" test then registers its `console` event listener at line 19 — **after the page has already been fully loaded by `beforeEach`**. Any console errors that fire during the initial JavaScript evaluation (the most common failure mode, as seen with the `__fbBatchedBridgeConfig` error on the mobile side) are already gone and will never be captured. The test will always pass even when the app is broken.

**Fix:** Either remove `beforeEach` for this test or navigate inside the test body after the listener is set up (matching the correct pattern used in `e2e/mobile.spec.ts:13-28`):
```typescript
test('should load the app without critical console errors', async ({ page }) => {
  const errors: string[] = [];

  // Register BEFORE navigating
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  // ...
});
```

---

### WR-04: `@netlify/plugin-nextjs` not installed in any `package.json`

**File:** `apps/generator/netlify.toml:12-13`

**Issue:** The generator's `netlify.toml` declares:
```toml
[[plugins]]
  package = "@netlify/plugin-nextjs"
```
But `@netlify/plugin-nextjs` does not appear in `apps/generator/package.json` devDependencies or in the root `package.json`. Netlify will attempt to install this plugin at build time; whether it uses the pinned monorepo lockfile or installs it independently is undefined and version-unpredictable. Furthermore, the app uses `output: 'export'` (fully static) so the Next.js plugin — which is designed for SSR/ISR on Netlify's lambda infrastructure — is redundant and potentially harmful (it may override the static build process). The comment in root `netlify.toml` explicitly notes "Skip Next.js plugin - game site uses Expo" but the generator site has the same constraint: static export does not need the Next.js plugin.

**Fix:** Remove the plugin declaration from `apps/generator/netlify.toml` since the output is a fully static export:
```toml
# Remove these two lines:
# [[plugins]]
#   package = "@netlify/plugin-nextjs"
```
If the plugin is later needed, pin it in `package.json` and commit it to the lockfile.

---

## Info

### IN-01: Hardcoded `waitForTimeout(2000)` increases flakiness risk

**File:** `e2e/mobile.spec.ts:33`

**Issue:** `await page.waitForTimeout(2000)` is an unconditional 2-second pause added to "wait for async errors." This pattern is fragile: on a slow CI machine the window may still be too short; on a fast machine it adds 2 seconds to every run of this test. Playwright provides deterministic alternatives.

**Fix:** Replace with a condition-based wait, e.g. wait for a visible element that only appears after full hydration:
```typescript
await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
```
Then any errors that arrive before that element renders will be captured.

---

### IN-02: `NODE_VERSION` in `netlify.toml` duplicates `.nvmrc`

**File:** `netlify.toml:22` / `.nvmrc:1`

**Issue:** `.nvmrc` pins Node 20 and `[build.environment]` in `netlify.toml` also sets `NODE_VERSION = "20"`. These are two separate sources of truth. If `.nvmrc` is updated to (for example) Node 22 but `netlify.toml` is not, Netlify will silently use Node 20 while local dev uses Node 22, causing divergence.

**Fix:** Netlify respects `.nvmrc` automatically — remove the explicit `NODE_VERSION` line from `netlify.toml` to rely on a single source of truth:
```toml
# Remove this line:
# NODE_VERSION = "20"
```

---

### IN-03: `webServer` in `playwright.config.ts` has no build step — fails on clean checkout

**File:** `playwright.config.ts:15-28`

**Issue:** The `webServer` configuration starts `serve apps/mobile/dist` and `serve apps/generator/out` but does not build the apps first. On a clean checkout (no prior build), these directories do not exist and `serve` will either fail or serve an empty directory. The `reuseExistingServer: !process.env.CI` setting means local devs who have a prior build won't notice, but CI will fail with a confusing "directory not found" or "empty response" error rather than a clear "build first" message.

**Fix:** Add a `waitForServe` or preLaunch option, or document in the root `package.json` that `pnpm build` must run before `pnpm test:e2e`. Alternatively, change the `webServer.command` to build-then-serve:
```typescript
command: 'pnpm --filter @trivial-world/mobile build && npx serve apps/mobile/dist -l 3001 --single',
```

---

### IN-04: Build script uses `cp` — not portable on Windows

**File:** `apps/mobile/package.json:10-11`

**Issue:** The `build` and `build:web` scripts use `cp public/_redirects dist/_redirects`. The `cp` command is unavailable on Windows without Git Bash or WSL. While React Native / Expo development is primarily Unix/macOS, this is worth noting given `pnpm` supports cross-platform workspaces.

**Fix:** Replace `cp` with the `copyfiles` npm package (already common in Expo projects) or use Node's built-in:
```json
"build": "expo export --platform web && node -e \"require('fs').copyFileSync('public/_redirects','dist/_redirects')\""
```
Or add `copyfiles` as a dev dependency and use `copyfiles public/_redirects dist/`.

---

_Reviewed: 2026-06-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
