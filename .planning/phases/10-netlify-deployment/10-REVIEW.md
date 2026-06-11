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
  warning: 0
  info: 5
  total: 5
status: issues_found
---

# Phase 10: Code Review Report (Re-review after iter1 fixes)

**Reviewed:** 2026-06-11
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

All four Warnings from the iter1 review have been successfully resolved:

- WR-01: `apps/generator/package.json` build script now copies `_redirects` to `out/` — confirmed fixed.
- WR-02: Root `netlify.toml` now has a clear comment block naming both per-site publish paths. `apps/generator/netlify.toml` now has an explicit `publish = "out"` key — meaningful improvement.
- WR-03: `e2e/generator.spec.ts` console-error test now registers the listener before calling `page.goto('/')` inside the test body — confirmed fixed.
- WR-04: `@netlify/plugin-nextjs` plugin declaration removed from `apps/generator/netlify.toml` — confirmed fixed.

Five Info-level items remain, including one that has grown slightly in scope: `NODE_VERSION` is now pinned in three places (`.nvmrc`, root `netlify.toml`, and `apps/generator/netlify.toml`) rather than two. The four remaining items from iter1 (IN-01 through IN-04) are unchanged. None are blocking, but they represent maintenance and reliability risks.

---

## Info

### IN-01: Hardcoded `waitForTimeout(2000)` increases test flakiness risk

**File:** `e2e/mobile.spec.ts:33`

**Issue:** `await page.waitForTimeout(2000)` is an unconditional 2-second pause intended to "wait for async errors." This is fragile: on a slow CI machine the window may be too short; on a fast machine it wastes 2 seconds per run. Playwright provides deterministic condition-based alternatives that are both faster and more reliable.

**Fix:** Replace with a condition-based wait on a visible element that only appears after full hydration:
```typescript
await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
```
Any errors that arrive before that element renders will be captured without an arbitrary pause.

---

### IN-02: `NODE_VERSION` now pinned in three places

**File:** `netlify.toml:26` / `apps/generator/netlify.toml:9` / `.nvmrc:1`

**Issue:** The iter1 fix added `NODE_VERSION = "20"` to `apps/generator/netlify.toml`, but this value was already present in the root `netlify.toml` and in `.nvmrc`. There are now three independent sources of truth for the Node version. If `.nvmrc` is bumped to Node 22 in a future upgrade, both `netlify.toml` files must also be updated. Missing any one of them causes Netlify to silently use a different Node version than local development.

**Fix:** Netlify respects `.nvmrc` automatically — remove `NODE_VERSION` from both toml files and let `.nvmrc` serve as the single source of truth:
```toml
# In both netlify.toml and apps/generator/netlify.toml — remove:
# NODE_VERSION = "20"
```

---

### IN-03: `webServer` in `playwright.config.ts` has no build step — fails on clean checkout

**File:** `playwright.config.ts:15-28`

**Issue:** The `webServer` entries run `npx serve apps/mobile/dist` and `npx serve apps/generator/out` directly without building first. On a clean checkout (or after running `git clean -fdx`), these directories do not exist. The `reuseExistingServer: !process.env.CI` flag means local developers with a prior build will not notice the problem, but CI runs always start clean and will fail with an opaque "could not connect to server" error rather than a clear "build first" message.

**Fix:** Either embed a build step in the `webServer.command`, or add a top-level `test:e2e` script that builds before testing. The minimal change is:
```typescript
{
  command: 'pnpm --filter @trivial-world/mobile build && npx serve apps/mobile/dist -l 3001 --single',
  url: 'http://localhost:3001',
  reuseExistingServer: !process.env.CI,
  timeout: 120000, // allow time for build
},
{
  command: 'pnpm --filter @trivial-world/generator build && npx serve apps/generator/out -l 3002 --single',
  url: 'http://localhost:3002',
  reuseExistingServer: !process.env.CI,
  timeout: 120000,
},
```

---

### IN-04: Both build scripts use `cp` — not portable on Windows

**File:** `apps/mobile/package.json:10-11` / `apps/generator/package.json:7`

**Issue:** The `cp` command used in both `build` scripts (`cp public/_redirects dist/_redirects` and `cp public/_redirects out/_redirects`) is unavailable on Windows without Git Bash or WSL. The iter1 fix correctly applied the same pattern to the generator, but the underlying portability gap now exists in both apps. While Expo / React Native development is primarily Unix/macOS, the monorepo's use of `pnpm` workspaces makes cross-platform consistency worth maintaining.

**Fix:** Use Node's built-in `fs.copyFileSync` or the `copyfiles` package in both scripts:
```json
// apps/mobile/package.json
"build": "expo export --platform web && node -e \"require('fs').copyFileSync('public/_redirects','dist/_redirects')\""

// apps/generator/package.json
"build": "next build && node -e \"require('fs').copyFileSync('public/_redirects','out/_redirects')\""
```
Or add `copyfiles` as a shared devDependency and use `copyfiles -f public/_redirects dist/`.

---

### IN-05: Root `netlify.toml` still has no `publish` key for the mobile site

**File:** `netlify.toml:16-22`

**Issue:** WR-02 was resolved by improving the comment block to name both required publish paths, and the generator's dedicated `apps/generator/netlify.toml` now has `publish = "out"`. However, the root `netlify.toml` (used for the mobile/game Netlify site) still has no `publish` key. A new team member who creates a Netlify site pointing at the repo root will get Netlify's default publish directory (typically the repo root itself), not `apps/mobile/dist`. The comment mitigates discoverability, but the risk of silent misconfiguration on site creation persists.

**Fix:** Add an explicit `publish` key for the primary (mobile) site, even if it requires a UI override for the secondary (generator) site. This makes the mobile deployment self-contained and reduces reliance on invisible UI state:
```toml
[build]
  command = "pnpm install && pnpm build"
  publish = "apps/mobile/dist"
```

---

_Reviewed: 2026-06-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
