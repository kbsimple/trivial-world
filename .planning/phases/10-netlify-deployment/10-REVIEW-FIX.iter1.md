---
phase: 10-netlify-deployment
fixed_at: 2026-06-11T00:00:00Z
review_path: .planning/phases/10-netlify-deployment/10-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-06-11
**Source review:** .planning/phases/10-netlify-deployment/10-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Generator `_redirects` never copied to output

**Files modified:** `apps/generator/package.json`
**Commit:** aad5ea8
**Applied fix:** Changed the generator build script from `"next build"` to `"next build && cp public/_redirects out/_redirects"`. Next.js static export does not automatically copy Netlify-specific files from `public/` to `out/`, so the SPA redirect rules would have been absent after a clean build.

---

### WR-02: Root `netlify.toml` missing `publish` directory — depends on Netlify UI config

**Files modified:** `netlify.toml`
**Commit:** 92cd317
**Applied fix:** Replaced the terse inline comment "Publish directory set per-site in Netlify UI" with an explicit multi-line comment block naming the exact publish path required for each site (`apps/mobile/dist` and `apps/generator/out`). A single `publish` key cannot be set at the root level because the file is shared by two separate Netlify sites — the comment now makes this constraint and the required UI settings visible in the repository.

---

### WR-03: Generator E2E console-error test misses load-time errors

**Files modified:** `e2e/generator.spec.ts`
**Commit:** 1e4e289
**Applied fix:** Added an explicit `await page.goto('/')` inside the `'should load the app without critical console errors'` test body, placed after the `page.on('console', ...)` listener registration. The `beforeEach` still navigates for the other tests in the describe block, but the console-error test now controls its own navigation order so that load-time errors are captured. This matches the correct pattern already in use in `e2e/mobile.spec.ts`.

---

### WR-04: `@netlify/plugin-nextjs` not installed in any `package.json`

**Files modified:** `apps/generator/netlify.toml`
**Commit:** e25343d
**Applied fix:** Removed the `[[plugins]]` block declaring `@netlify/plugin-nextjs`. The generator uses `output: 'export'` (fully static Next.js build), so the SSR/ISR-oriented Netlify plugin is both unnecessary and potentially harmful. Replaced the block with a comment explaining why the plugin is absent, so future maintainers do not inadvertently re-add it.

---

_Fixed: 2026-06-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
