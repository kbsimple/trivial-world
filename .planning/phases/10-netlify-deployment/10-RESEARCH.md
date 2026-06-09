# Phase 10: Netlify Deployment - Research

**Researched:** 2026-06-09
**Domain:** Netlify deployment for monorepo with Turborepo, SPA redirects, GitHub integration
**Confidence:** HIGH

## Summary

This phase deploys two static apps (game and generator) to Netlify via GitHub integration. Both apps use client-side routing and require SPA redirect configuration. The monorepo uses Turborepo for builds, with `pnpm build` at root building both apps. Netlify's enhanced monorepo support (2025+) automatically detects Turborepo and provides site picker UI. Two separate Netlify sites are created from the same repository, each with its own build configuration pointing to different publish directories.

**Primary recommendation:** Create a single root `netlify.toml` with two deploy contexts using Netlify's monorepo support. Each site connects to the same GitHub repo but uses different publish directories (`apps/mobile/dist/` for game, `apps/generator/out/` for generator). SPA redirects are configured in the root `netlify.toml` for both sites.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Build orchestration | CI/CD (Netlify) | — | Netlify runs Turborepo builds automatically on push |
| Static file serving | CDN (Netlify) | — | Netlify's CDN serves static exports globally |
| SPA routing | CDN (Netlify) | — | Netlify rewrites handle client-side routing |
| HTTPS termination | CDN (Netlify) | — | Netlify provides automatic SSL certificates |
| Preview environments | CI/CD (Netlify) | — | Deploy previews created automatically for PRs |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Two separate Netlify sites: `trivial-world-game.netlify.app` (game app) and `trivial-world-generator.netlify.app` (generator app). Clear separation, follows prior decision D-03 from Phase 9.
- **D-02:** Single root `netlify.toml` at monorepo root. One source of truth for both sites. Simpler monorepo management.
- **D-03:** Root build with Turborepo caching. Netlify runs `pnpm install && pnpm build` at root. Turborepo handles dependency graph and incremental builds automatically. No Remote Cache needed — local caching is sufficient.
- **D-04:** Separate build contexts in netlify.toml for game app and generator app. Each app specifies its own publish directory (`apps/mobile/dist/` for game, `apps/generator/out/` for generator).
- **D-05:** Enable PR previews for both sites. Every pull request gets a preview URL for testing before merge. Uses Netlify build minutes but catches issues early.
- **D-06:** No production environment variables needed for v3.0. Both apps are static sites with no server-side state.
- **D-07:** OLLAMA_HOST is client-side configuration (not a production env var). Users run Ollama locally and configure the endpoint in the generator app UI. Generator makes client-side requests to the user's Ollama instance.
- **D-08:** Analytics/monitoring deferred to future. Can add environment variables via Netlify UI later without code deployment.
- **D-09:** Both apps use client-side routing and need SPA redirects. Add `/* /index.html 200` rewrite rules for both apps in netlify.toml. Expo Router (game) and Next.js App Router (generator) both require this for deep linking.
- **D-10:** HTTPS enforced by Netlify default. No additional configuration needed. Netlify provides SSL certificates automatically.

### Claude's Discretion

- Exact netlify.toml structure (headers, redirects syntax)
- Build timeout configuration if needed
- Notification settings for deploy success/failure
- Branch protection rules for main (optional)

### Deferred Ideas (OUT OF SCOPE)

- Custom domain configuration (future decision)
- IndexedDB persistence (deferred)
- Server-side functions (both apps are static)
- Ollama hosting (dev-only, users run locally)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GEN-01 | Generator accessible as static web app on Netlify | Next.js static export at `apps/generator/out/`, deploy via Netlify |
| GEN-02 | Existing Next.js static export works without modification | Already configured with `output: 'export'` and `distDir: 'out'` |
| NETL-01 | Both apps deploy automatically from main branch via GitHub sync | Netlify GitHub integration with automatic deployment on push |
| NETL-02 | SPA redirects configured for deep linking | `/* /index.html 200` rewrite rules in netlify.toml |
| NETL-03 | Two separate Netlify sites | Two site entries in Netlify, same repo, different publish directories |
| PWA-02 | HTTPS enforced | Netlify default behavior, no configuration needed |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Netlify Platform | N/A | Static hosting + CDN | Industry standard for static sites, automatic HTTPS, deploy previews |
| Turborepo | ^2.0.0 | Monorepo build orchestration | Already in use, handles dependency graph |
| pnpm | 9.0.0 | Package manager | Already in use, workspace support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| netlify.toml | N/A | Build configuration file | Single source of truth for both sites |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Netlify | Vercel | Vercel has better Next.js integration but Netlify is already chosen (D-01 from Phase 7) |
| Two separate sites | Single site with paths | Simpler deployment model, independent deploy histories per D-03 |

**Installation:**
No additional packages needed. Configuration-only change via `netlify.toml`.

**Version verification:**
- Turborepo: ^2.0.0 (already installed)
- pnpm: 9.0.0 (already in use)
- Node: v25.9.0 (current environment)

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           GitHub Repository                              │
│                    (trivial-world monorepo)                              │
│  ┌─────────────────────┐    ┌─────────────────────┐                    │
│  │   apps/mobile/       │    │   apps/generator/    │                    │
│  │   (Expo web export)  │    │   (Next.js static)   │                    │
│  └─────────────────────┘    └─────────────────────┘                    │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            │ Push to main / PR
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Netlify Build System                               │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  pnpm install && pnpm build                                         │ │
│  │  (Turborepo runs both app builds)                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                            │                                             │
│              ┌─────────────┴─────────────┐                              │
│              ▼                           ▼                              │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │ Game App Build      │    │ Generator App Build │                     │
│  │ apps/mobile/dist/   │    │ apps/generator/out/ │                     │
│  └─────────────────────┘    └─────────────────────┘                     │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ Netlify Site 1           │  │ Netlify Site 2           │
│ trivial-world-game       │  │ trivial-world-generator │
│ .netlify.app             │  │ .netlify.app            │
├─────────────────────────┤  ├─────────────────────────┤
│ Publish:                │  │ Publish:                │
│ apps/mobile/dist/       │  │ apps/generator/out/     │
│                         │  │                         │
│ SPA Rewrite:            │  │ SPA Rewrite:            │
│ /* → /index.html (200)   │  │ /* → /index.html (200)  │
└─────────────────────────┘  └─────────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ HTTPS CDN (Netlify)     │  │ HTTPS CDN (Netlify)     │
│ SSL Auto-Provisioned    │  │ SSL Auto-Provisioned    │
└─────────────────────────┘  └─────────────────────────┘
```

### Recommended Project Structure

The project already has the correct structure. No changes needed:

```
trivial-world/
├── netlify.toml          # NEW: Root configuration for both sites
├── package.json          # Root build: "build": "turbo run build"
├── turbo.json           # Pipeline configuration
├── apps/
│   ├── mobile/
│   │   ├── dist/        # Expo web export output (build artifact)
│   │   ├── app.config.js
│   │   └── package.json # build:web script
│   └── generator/
│       ├── out/         # Next.js static export output (build artifact)
│       ├── next.config.ts
│       └── package.json # build script
└── packages/
    └── types/          # Shared Zod schemas
```

### Pattern 1: Root netlify.toml for Monorepo

**What:** Single `netlify.toml` at repository root with build configuration for both sites.

**When to use:** Standard pattern for monorepo deployments to Netlify.

**Example:**
```toml
# Root netlify.toml - build configuration for monorepo

# Build settings (applied at root)
[build]
  command = "pnpm install && pnpm build"
  # No publish here - each site has its own

# Game app site configuration
# Create separate Netlify site, set base directory to apps/mobile
# OR use context-specific configuration below

# Generator app site configuration
# Create separate Netlify site, set base directory to apps/generator
# OR use context-specific configuration below

# SPA Redirects - placed in each app's public directory
# or configured per-site in Netlify UI

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Important:** For monorepos with two separate sites, the recommended approach is:
1. Create two Netlify sites pointing to the same repo
2. Each site has its own build configuration in Netlify UI:
   - Game site: Build command `pnpm build`, publish `apps/mobile/dist`
   - Generator site: Build command `pnpm build`, publish `apps/generator/out`
3. Place `_redirects` file in each app's source to be copied to output

### Pattern 2: SPA Redirects via _redirects File

**What:** Each app includes a `_redirects` file in its source that gets copied to the build output.

**When to use:** When each app needs different redirect rules.

**Example:**

For game app (`apps/mobile/public/_redirects` or handled via Expo):
```
/*    /index.html   200
```

For generator app (`apps/generator/public/_redirects`):
```
/*    /index.html   200
```

**Note:** Next.js static export copies files from `public/` to `out/`. For Expo, files in `assets/` or a `public/` directory get copied to `dist/`.

### Anti-Patterns to Avoid

- **Placing netlify.toml in app subdirectories:** Netlify's monorepo support expects configuration at root or via UI. Multiple `netlify.toml` files cause confusion.
- **Using `base` directory setting:** Breaks Turborepo's dependency resolution. Build should run at root.
- **Forgetting SPA redirects:** Direct navigation to routes like `/game` will return 404 without the rewrite rule.
- **Setting publish directory incorrectly:** Must be relative to repository root, not base directory.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SPA routing | Custom server or lambda | Netlify redirects | Edge CDN handles rewrites faster |
| SSL certificates | Let's Encrypt manually | Netlify automatic | Auto-provisioned, auto-renewed |
| Deploy previews | Custom CI/CD pipeline | Netlify deploy previews | Built-in, automatic for PRs |
| Build caching | Custom cache scripts | Turborepo + Netlify | Both handle caching automatically |

**Key insight:** Netlify's platform handles all deployment complexity. Focus on configuration, not infrastructure.

## Runtime State Inventory

> This phase involves only deployment configuration. No runtime state changes required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — both apps are static | None |
| Live service config | Netlify sites (to be created) | Create via Netlify UI or CLI |
| OS-registered state | None | None |
| Secrets/env vars | None per D-06, D-07, D-08 | None |
| Build artifacts | `apps/mobile/dist/`, `apps/generator/out/` | Already generated by Phase 9 |

**Nothing found in category:** Build artifacts already exist from Phase 9 web export. No additional runtime state.

## Common Pitfalls

### Pitfall 1: SPA Redirects Not Applied
**What goes wrong:** Direct navigation to routes (e.g., `/game` or `/review`) returns 404 errors. Refresh on non-root URLs fails.

**Why it happens:** Netlify serves static files first. Without redirect rules, it looks for `/game/index.html` which doesn't exist for SPAs.

**How to avoid:** Create `_redirects` file in each app's source directory (or use netlify.toml):
- Game: Ensure `apps/mobile/public/_redirects` or equivalent
- Generator: Create `apps/generator/public/_redirects` with `/* /index.html 200`

**Warning signs:** 404 errors on page refresh, routes work via navigation but not direct URL access.

### Pitfall 2: Wrong Publish Directory
**What goes wrong:** Deploy succeeds but shows empty or wrong content.

**Why it happens:** Netlify publish directory must be relative to repository root, not the app directory. Setting `publish = "dist"` when running from `apps/mobile/` looks for `apps/mobile/dist`, but root-level config expects absolute path.

**How to avoid:** Use full path from root: `apps/mobile/dist` for game, `apps/generator/out` for generator.

**Warning signs:** Deploy logs show "Publish directory is empty" or wrong files deployed.

### Pitfall 3: Turborepo Cache Not Invalidation on Dependency Changes
**What goes wrong:** Deployed app has stale dependencies after package.json changes.

**Why it happens:** Turborepo's local cache persists between builds. Netlify doesn't clear cache by default.

**How to avoid:** Turborepo handles this correctly via its dependency graph. If issues occur, use "Clear cache and deploy" in Netlify UI. For persistent issues, add `pnpm install` to build command (already in D-03).

**Warning signs:** Builds complete quickly but have old dependency versions, runtime errors from missing packages.

### Pitfall 4: Build Command Running from Wrong Directory
**What goes wrong:** Build fails because Turborepo can't find packages, or only one app builds.

**Why it happens:** Setting `base` directory in netlify.toml changes where build runs. Turborepo needs root for monorepo resolution.

**How to avoid:** Run build at root (no `base` directory in netlify.toml), let Turborepo handle the rest. Current build command `pnpm build` runs `turbo run build` which correctly builds both apps.

**Warning signs:** "Cannot find package" errors, only one app deploying, workspace resolution failures.

### Pitfall 5: PR Previews for Both Sites Confusion
**What goes wrong:** PR preview URLs don't work or deploy to wrong site.

**Why it happens:** Each Netlify site has its own deploy preview URL pattern. The same PR triggers builds on both sites.

**How to avoid:** Understand that both sites will have preview URLs:
- Game preview: `deploy-preview-PR#--trivial-world-game.netlify.app`
- Generator preview: `deploy-preview-PR#--trivial-world-generator.netlify.app`

Both deploy automatically. No action needed.

**Warning signs:** Preview URL shows wrong app, 404 on preview URLs.

## Code Examples

### netlify.toml Configuration

```toml
# Netlify configuration for Trivial World monorepo
# Two sites: trivial-world-game and trivial-world-generator
#
# IMPORTANT: This file applies to BOTH sites when placed at root.
# For site-specific publish directories, configure in Netlify UI:
#   - Game site: Publish directory = apps/mobile/dist
#   - Generator site: Publish directory = apps/generator/out

[build]
  # Build both apps with Turborepo
  command = "pnpm install && pnpm build"
  # Publish directory set per-site in Netlify UI

[build.environment]
  # Node version for build
  NODE_VERSION = "20"

# Production context (main branch)
[context.production]
  command = "pnpm install && pnpm build"

# Deploy preview context (pull requests)
[context.deploy-preview]
  command = "pnpm install && pnpm build"

# Branch deploy context (other branches)
[context.branch-deploy]
  command = "pnpm install && pnpm build"

# Headers for security (applies to all routes)
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-X-Script-Type = "nosniff"

# SPA redirect for game app routes
# Note: This applies when netlify.toml is in the publish directory
# For monorepo, better to use _redirects file in each app
```

### Generator _redirects File

Create `apps/generator/public/_redirects`:
```
/*    /index.html   200
```

This file will be copied to `apps/generator/out/_redirects` during Next.js static export.

### Game App _redirects File

For Expo, create the redirects file in the web output. Since Expo uses `output: 'single'` mode, we need to handle this differently. Option 1: Create in `public/` directory (if Expo supports it). Option 2: Post-build copy step.

Option 2 - Add to `apps/mobile/package.json`:
```json
{
  "scripts": {
    "build:web": "expo export --platform web && cp public/_redirects dist/_redirects"
  }
}
```

Create `apps/mobile/public/_redirects`:
```
/*    /index.html   200
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate repo per site | Monorepo with multiple Netlify sites | 2019+ | Easier code sharing, single source of truth |
| Manual deploy scripts | Git-connected auto-deploy | 2015+ | Push to branch triggers build automatically |
| Custom CI/CD pipeline | Netlify built-in CI | 2016+ | No Jenkins/Travis configuration needed |
| Per-site netlify.toml in subdirectory | Root netlify.toml + UI configuration | 2024+ | Better monorepo support, cleaner structure |

**Deprecated/outdated:**
- **Netlify.toml `base` directory for monorepos:** Can break Turborepo resolution. Run at root instead.
- **Custom build scripts for monorepos:** Netlify now detects and handles Turborepo automatically.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Expo Router `output: 'single'` requires SPA redirect configuration | Architecture Patterns | If Expo handles this automatically, we'd have duplicate redirect rules |
| A2 | Netlify build image has Node 20+ available | Code Examples | If only older Node available, need to specify in `.nvmrc` or `NODE_VERSION` env var |
| A3 | Both apps build successfully with current `pnpm build` | Architecture Patterns | If one app fails, both deploys fail |
| A4 | GitHub repository is already connected to Netlify | Architecture Patterns | User needs to connect repo manually before first deploy |

## Open Questions (RESOLVED)

1. **Does Expo web export require a `public/` directory for static files?**
   - What we know: Expo static export creates `dist/` folder
   - What's unclear: How to include `_redirects` file in the output
   - RESOLVED: Use post-build copy step to include `_redirects` in output (Plan 10-01 Task 3)

2. **Should we add a `.nvmrc` file for explicit Node version?**
   - What we know: Netlify uses Node 18 by default, can specify in netlify.toml
   - What's unclear: Exact Node version requirements for Expo SDK 56
   - RESOLVED: Create `.nvmrc` with Node 20 and add `NODE_VERSION` to netlify.toml (Plan 10-01 Tasks 1 & 4)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build system | ✓ | 25.9.0 | — |
| pnpm | Package manager | ✓ | 9.0.0 | — |
| Turborepo | Build orchestration | ✓ | 2.0.0 | — |
| Netlify CLI | Local testing (optional) | ✗ | — | Deploy via GitHub |
| GitHub repository | CI/CD trigger | ✓ | — | — |

**Missing dependencies with no fallback:**
- Netlify sites need to be created manually (one-time setup via Netlify UI or CLI)
- GitHub repository needs to be connected to Netlify (one-time setup)

**Missing dependencies with fallback:**
- Netlify CLI is optional for local testing. Can use `netlify dev` locally or rely on GitHub auto-deploy.

## Validation Architecture

> Note: `workflow.nyquist_validation` not found in `.planning/config.json`, defaulting to enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (already in use) |
| Config file | `vitest.config.ts` (per-app) |
| Quick run command | `pnpm test` (at root) |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GEN-01 | Generator accessible as static web app | Integration | `curl https://trivial-world-generator.netlify.app` | ❌ Wave 0 (post-deploy) |
| GEN-02 | Next.js static export works | Build | `pnpm build && ls apps/generator/out/index.html` | ✅ Build verification |
| NETL-01 | Deploy from main branch | Manual | Netlify UI verification | ❌ Manual only |
| NETL-02 | SPA redirects configured | Integration | `curl https://site.netlify.app/nonexistent-route` returns 200 | ❌ Wave 0 (post-deploy) |
| NETL-03 | Two separate Netlify sites | Manual | Netlify UI verification | ❌ Manual only |
| PWA-02 | HTTPS enforced | Integration | `curl -I https://site.netlify.app` shows HTTPS | ❌ Wave 0 (post-deploy) |

### Sampling Rate
- **Per task commit:** Build command succeeds locally
- **Per wave merge:** Build command succeeds + static files exist
- **Phase gate:** Both sites accessible via HTTPS, SPA redirects work, deep linking works

### Wave 0 Gaps
- [ ] Post-deploy verification tests (curl-based smoke tests)
- [ ] Manual verification checklist for Netlify UI configuration

*(Infrastructure phase — most verification is manual/deployment-based)*

## Security Domain

> Security enforcement enabled by default.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Both apps are static with no authentication |
| V3 Session Management | no | No sessions (client-side only apps) |
| V4 Access Control | no | No access control (public static sites) |
| V5 Input Validation | no | No server-side input processing |
| V6 Cryptography | no | HTTPS provided by Netlify, no custom crypto |
| V1 Architecture | yes | Static deployment, HTTPS enforced |

### Known Threat Patterns for Static Sites on Netlify

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via user content | Tampering | N/A - no user content storage |
| DDoS | Denial | Netlify CDN handles DDoS protection [CITED] |
| Domain takeover | Tampering | Netlify owns *.netlify.app domain |
| Content injection | Tampering | Static content only, no dynamic rendering |
| Supply chain attack | Tampering | Verify build dependencies via pnpm lockfile |

## Sources

### Primary (HIGH confidence)
- [Netlify File-based Configuration Docs](https://docs.netlify.com/build/configure-builds/file-based-configuration/) - netlify.toml syntax, contexts, redirects, headers
- [Netlify Redirects Overview](https://docs.netlify.com/manage/routing/redirects/overview/) - SPA redirect configuration
- [Netlify Monorepo Deployment Guide](https://netli.fyi/blog/netlify-monorepo-deploys) - Turborepo configuration, multiple sites
- [Netlify Enhanced Monorepo Experience](https://www.netlify.com/blog/better-monorepos-on-netlify/) - Site picker, auto-detection

### Secondary (MEDIUM confidence)
- [Netlify Deploy Overview](https://docs.netlify.com/deploy/deploy-overview/) - Deploy previews, branch deploys
- [Netlify GitHub Integration](https://www.netlify.com/guides/how-github-integrates-with-netlify/) - Auto-deploy mechanism
- [Expo Web Hosting Providers](https://expo-expo.mintlify.app/deployment/hosting-providers) - Netlify-specific Expo deployment

### Tertiary (LOW confidence)
- [GitHub Issue #19351 - Expo web redirects](https://github.com/expo/expo/issues/19351) - Community workaround for _redirects

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Netlify is well-documented, Turborepo already in use
- Architecture: HIGH - Standard monorepo deployment pattern with enhanced Netlify support
- Pitfalls: HIGH - Common issues documented in Netlify forums and docs

**Research date:** 2026-06-09
**Valid until:** 90 days (Netlify configuration stable, monorepo support mature)