---
phase: 10-netlify-deployment
plan: 01
subsystem: infra
tags: [netlify, deployment, spa-redirects, turborepo, monorepo]

# Dependency graph
requires:
  - phase: 09-mobile-web-export
    provides: Static web export for mobile app (dist/ folder)
  - phase: 07-question-generator-web-app
    provides: Static Next.js export for generator (out/ folder)
provides:
  - Root netlify.toml with build configuration for monorepo
  - SPA redirect files for both apps
  - .nvmrc for Node version consistency
  - Mobile app build script for Turborepo
affects:
  - Phase 10 Plan 02 (Netlify site creation and verification)

# Tech tracking
tech-stack:
  added:
    - netlify.toml (Netlify configuration)
    - .nvmrc (Node version specification)
    - _redirects files (Netlify SPA routing)
  patterns:
    - Root netlify.toml for monorepo deployment
    - _redirects files for SPA client-side routing
    - Turborepo build command at root

key-files:
  created:
    - netlify.toml
    - apps/generator/public/_redirects
    - apps/mobile/public/_redirects
    - .nvmrc
  modified:
    - apps/mobile/package.json (build script added)

key-decisions:
  - "D-02: Single root netlify.toml at monorepo root"
  - "D-03: Root build with Turborepo caching"
  - "D-09: SPA redirects for both apps via _redirects files"

patterns-established:
  - "Pattern 1: _redirects file in public/ directory copied to output during build"
  - "Pattern 2: Mobile app uses build script with post-build copy step"

requirements-completed:
  - GEN-01
  - GEN-02
  - NETL-01
  - NETL-03
  - PWA-02

# Metrics
duration: 4min
completed: 2026-06-09
---
# Phase 10 Plan 1: Netlify Configuration Summary

**Created Netlify deployment configuration for monorepo with SPA redirects, enabling automatic GitHub-synced deployment of both game and generator apps.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-09T21:25:25Z
- **Completed:** 2026-06-09T21:29:33Z
- **Tasks:** 5
- **Files modified:** 7

## Accomplishments

- Root netlify.toml with build command, Node version, and security headers
- SPA redirect files for generator app (Next.js static export)
- SPA redirect files for mobile app (Expo web export)
- .nvmrc for Node 20 LTS version consistency
- Mobile app build script for Turborepo integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create root netlify.toml** - `774abd7` (feat)
2. **Task 2: Create SPA redirect for generator** - `f3e10a6` (feat)
3. **Task 3: Create SPA redirect for mobile** - `654c8ad` (feat)
4. **Task 4: Create .nvmrc** - `2b4c044` (feat)
5. **Task 5: Verify build** - `316443b` (fix - deviation)

**Additional commits:**
- `1ec2125` (refactor) - Convert app.json to app.config.js (Phase 9 uncommitted work)
- `7a81670` (chore) - Add .expo and .tamagui to gitignore

## Files Created/Modified

| File | Purpose |
|------|---------|
| `netlify.toml` | Root Netlify configuration for monorepo build |
| `apps/generator/public/_redirects` | SPA redirect rule for Next.js static export |
| `apps/mobile/public/_redirects` | SPA redirect rule for Expo web export |
| `apps/mobile/package.json` | Added `build` script for Turborepo |
| `.nvmrc` | Node 20 LTS version specification |
| `.gitignore` | Added .expo/ and .tamagui/ build artifacts |
| `apps/mobile/app.config.js` | Converted from app.json (uncommitted Phase 9 work) |

## Decisions Made

- Build command: `pnpm install && pnpm build` at root (Turborepo handles both apps)
- Node version: 20 LTS (matches Netlify default, specified in netlify.toml and .nvmrc)
- Security headers: X-Frame-Options=DENY, X-Content-Type-Options=nosniff
- SPA redirects: `/* /index.html 200` pattern for both apps

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Mobile app missing build script for Turborepo**
- **Found during:** Task 5 (build verification)
- **Issue:** Mobile app had `build:web` script but no `build` script. Turborepo's `pnpm build` calls `turbo run build`, which expects each package to have a `build` script. Without it, mobile app wouldn't build during Netlify deployment.
- **Fix:** Added `build` script to apps/mobile/package.json that calls the same command as `build:web`
- **Files modified:** apps/mobile/package.json
- **Verification:** `pnpm build` now builds all 3 packages (types, generator, mobile)
- **Committed in:** `316443b`

**2. [Rule 3 - Blocking] Uncommitted Phase 9 work (app.json to app.config.js conversion)**
- **Found during:** Task 5 (git status check)
- **Issue:** apps/mobile/app.config.js existed on disk but was never committed, and apps/mobile/app.json was deleted but not staged. This was work from Phase 9 that would have been lost.
- **Fix:** Staged and committed the conversion as a refactor commit
- **Files modified:** apps/mobile/app.config.js (new), apps/mobile/app.json (deleted)
- **Verification:** Git status clean, build succeeds with app.config.js
- **Committed in:** `1ec2125`

**3. [Rule 2 - Critical] Missing gitignore entries for build artifacts**
- **Found during:** Task 5 (git status check)
- **Issue:** .expo/ and .tamagui/ directories were created during build but not in .gitignore
- **Fix:** Added .expo/ and .tamagui/ patterns to root .gitignore
- **Files modified:** .gitignore
- **Verification:** Git status clean after gitignore update
- **Committed in:** `7a81670`

**4. [Rule 3 - Blocking] Netlify Next.js plugin incompatible with static export**
- **Found during:** Netlify build (Wave 2 checkpoint)
- **Issue:** Netlify auto-detected `@netlify/plugin-nextjs` which is incompatible with Next.js static exports. Both apps use static export (generator: `output: 'export'`, mobile: Expo web export). The plugin caused build failure with error: "Your publish directory was not found at: apps/mobile/dist"
- **Fix:** Added `[[plugins]]` section to netlify.toml to declare the Next.js plugin without invalid inputs
- **Files modified:** netlify.toml
- **Verification:** Push triggered new build
- **Committed in:** `0bf8798`

**5. [Rule 3 - Blocking] Metro bundler cannot resolve @tamagui/core**
- **Found during:** Netlify build (after plugin fix)
- **Issue:** Metro bundler (Expo) couldn't resolve `@tamagui/core` from hoisted node_modules in pnpm workspaces. Tamagui's static extraction process requires `@tamagui/core` and `@tamagui/static` as direct dependencies to properly process tokens and themes.
- **Fix:** Added `@tamagui/core` and `@tamagui/static` as direct dependencies in `apps/mobile/package.json`
- **Files modified:** apps/mobile/package.json, pnpm-lock.yaml
- **Verification:** Local build succeeds with `pnpm build`
- **Committed in:** `43ccc83`

---

**Total deviations:** 5 auto-fixed (3 blocking, 2 critical)
**Impact on plan:** All auto-fixes essential for deployment correctness. Mobile build script is required for Netlify to build both apps. Next.js plugin fix required for static exports. Tamagui dependencies required for Metro bundler. No scope creep.

## Issues Encountered

- Turborepo expects `build` script in each package - mobile only had `build:web`
- Phase 9 left uncommitted changes (app.config.js conversion)
- Build artifacts (.expo/, .tamagui/) needed gitignore entries

## User Setup Required

**External services require manual configuration.** Plan 10-02 will cover:
- Creating Netlify sites (trivial-world-game, trivial-world-generator)
- Connecting GitHub repository to both sites
- Configuring publish directories in Netlify UI

## Next Phase Readiness

- All configuration files ready for Netlify deployment
- Build command verified: `pnpm build` produces both app outputs
- SPA redirects in place for client-side routing
- Ready for Plan 10-02: Netlify site creation and deployment verification

## Self-Check: PASSED

- [x] `netlify.toml` exists at repository root
- [x] `apps/generator/public/_redirects` exists with correct content
- [x] `apps/mobile/public/_redirects` exists with correct content
- [x] `apps/mobile/dist/_redirects` exists after build
- [x] `apps/generator/out/_redirects` exists after build
- [x] `.nvmrc` exists with content `20`
- [x] `pnpm build` succeeds
- [x] All commits present in git log

---
*Phase: 10-netlify-deployment*
*Completed: 2026-06-09*