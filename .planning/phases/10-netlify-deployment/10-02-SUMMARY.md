---
phase: 10-netlify-deployment
plan: 02
subsystem: infra
tags: [netlify, deployment, playwright, e2e-tests, spa-routing]

# Dependency graph
requires:
  - phase: 10-netlify-deployment/01
    provides: Configuration files (netlify.toml, _redirects)
provides:
  - Automated E2E tests verifying both apps load and SPA routing works
  - playwright.config.ts with auto-start webServer configuration
  - SPA routing tests for mobile app (/game, /setup routes)
  - SPA routing tests for generator app (/review, /packs routes)
affects:
  - Phase 10 verification (test suite replaces manual Netlify UI checklist)

# Tech tracking
tech-stack:
  modified:
    - playwright.config.ts (added webServer auto-start, removed manual instructions)
    - e2e/mobile.spec.ts (added SPA Routing test suite)
    - e2e/generator.spec.ts (added SPA Routing test suite, fixed route names)

key-files:
  modified:
    - playwright.config.ts
    - e2e/mobile.spec.ts
    - e2e/generator.spec.ts

metrics:
  tests_added: 6
  tests_total: 20
  pass_rate: "20/20 (100%)"

# Commits
| Commit | Description |
|--------|-------------|
| 398494f | feat(phase-10): automate deployment verification with local Playwright tests |

---

## What Was Built

Replaced manual Netlify UI verification checklist with automated E2E tests using Playwright and local static servers.

**Changes:**
- `playwright.config.ts` — added `webServer` config: both servers auto-start before tests run (`npx serve apps/mobile/dist -l 3001 --single` and `npx serve apps/generator/out -l 3002 --single`), reuse existing server on local
- `e2e/mobile.spec.ts` — added "Mobile App - SPA Routing" suite: 3 tests verifying `/game`, `/setup`, and `/` routes return non-404 responses
- `e2e/generator.spec.ts` — added "Generator App - SPA Routing" suite: 3 tests verifying `/review`, `/packs`, and root `/` return correct content; fixed test that incorrectly used `/generate` (not a real route — generator lives at `/`)

**User context:** Netlify sites were already set up. User requested automated tests over manual verification. Tests run locally against built static exports, verifying the same behavior that Netlify's `_redirects` file provides in production.

## Deviations

- **Plan said**: Manual verification via Netlify UI (5 checkpoint tasks)
- **Actual**: Automated Playwright E2E tests against local static servers
- **Reason**: User explicitly requested automated tests. Local server approach tests the same SPA routing behavior (`--single` flag in `serve` mirrors Netlify's `_redirects` catch-all rule)

## Self-Check: PASSED

- [x] Playwright config updated with webServer auto-start
- [x] SPA routing tests added to both specs
- [x] All 20/20 tests pass
- [x] Committed with atomic commit
