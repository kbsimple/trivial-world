# Phase 10: Netlify Deployment - Pattern Map

**Mapped:** 2026-06-09
**Files analyzed:** 4 (new files)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `netlify.toml` (root) | config | request-response | `package.json` (build scripts), `turbo.json` (pipeline) | partial |
| `apps/generator/public/_redirects` | config | request-response | Next.js static export convention (no local file) | convention |
| `apps/mobile/public/_redirects` | config | request-response | Expo web export convention (no local file) | convention |
| `.nvmrc` (root) | config | build | README.md (Node version requirement) | documentation |

## Pattern Assignments

### `netlify.toml` (root)

**Role:** Build configuration file for Netlify deployment
**Data Flow:** Build-time configuration that orchestrates CI/CD pipeline

**Analog:** `package.json` (root build scripts) + `turbo.json` (pipeline configuration)

**Build command pattern** from `package.json` (lines 4-9):
```json
{
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  }
}
```

**Build output pattern** from `turbo.json` (lines 4-6):
```json
{
  "tasks": {
    "build": {
      "outputs": ["dist/**", ".expo/**", "out/**"]
    }
  }
}
```

**Netlify configuration to create:**
```toml
# Netlify configuration for Trivial World monorepo
# Two sites: trivial-world-game and trivial-world-generator
#
# Setup in Netlify UI:
#   - Game site: Publish directory = apps/mobile/dist
#   - Generator site: Publish directory = apps/generator/out

[build]
  command = "pnpm install && pnpm build"
  # Publish directory set per-site in Netlify UI (not here for monorepo)

[build.environment]
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
```

**Key configuration decisions:**
- Build runs at monorepo root (no `base` directory) to preserve Turborepo dependency resolution
- Node version specified as environment variable (20 LTS per README requirement)
- Same build command for all contexts (Turborepo handles incremental builds)
- No publish directory in netlify.toml — each Netlify site configured via UI with different publish paths

---

### `apps/generator/public/_redirects`

**Role:** SPA redirect configuration for Next.js static export
**Data Flow:** Runtime request rewrite for client-side routing

**Analog:** Next.js static export convention (file copied from `public/` to `out/`)

**Next.js static export config** from `apps/generator/next.config.ts` (lines 1-16):
```typescript
import type { NextConfig } from 'next';

/**
 * Next.js configuration for static export
 * Per D-17: Static export to Netlify CDN
 * No server functions required - all AI calls are client-side to Ollama
 */
const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
```

**_redirects file to create** at `apps/generator/public/_redirects`:
```
/*    /index.html   200
```

**Pattern:**
- Files in `public/` directory are copied to `out/` during `next build` with `output: 'export'`
- The `_redirects` file follows Netlify's redirect syntax
- `/*` matches all routes, `/index.html` is the SPA entry point, `200` returns success status
- Required for Next.js App Router client-side routing to work with direct URL access

---

### `apps/mobile/public/_redirects`

**Role:** SPA redirect configuration for Expo web export
**Data Flow:** Runtime request rewriting for client-side routing

**Analog:** Expo web export convention (Expo Router requires SPA redirect)

**Expo web config** from `apps/mobile/app.config.js` (lines 28-32):
```javascript
  web: {
    favicon: './assets/favicon.png',
    output: 'single',
    bundler: 'metro',
  },
```

**Expo build script** from `apps/mobile/package.json` (line 10):
```json
{
  "scripts": {
    "build:web": "expo export --platform web"
  }
}
```

**Post-build copy step** (modify `apps/mobile/package.json`):
```json
{
  "scripts": {
    "build:web": "expo export --platform web && cp public/_redirects dist/_redirects"
  }
}
```

**_redirects file to create** at `apps/mobile/public/_redirects`:
```
/*    /index.html   200
```

**Pattern:**
- Expo with `output: 'single'` creates a single-page app at `dist/index.html`
- Expo does not automatically include a `public/` directory in output
- Need to create `public/_redirects` and copy it to `dist/` via post-build step
- Required for Expo Router file-based routing to work with direct URL access

---

### `.nvmrc` (root)

**Role:** Node version specification for consistent builds
**Data Flow:** Build-time configuration

**Analog:** `README.md` (Node version requirement documentation)

**Node version requirement** from `README.md` (lines 19-21):
```markdown
## Prerequisites

- **Node.js** 18+
- **pnpm** 9.0+ (`npm install -g pnpm`)
```

**Current environment:** Node v25.9.0

**.nvmrc file to create** at root:
```
20
```

**Pattern:**
- `.nvmrc` specifies Node version for nvm users and CI systems
- Use Node 20 LTS (matches Netlify's NODE_VERSION environment variable)
- README specifies Node 18+, but Node 20 LTS is current stable
- Netlify and local environments should match for consistency

---

## Shared Patterns

### Build Command Pattern

**Source:** `package.json` (root)
**Apply to:** netlify.toml build configuration

```json
{
  "build": "turbo run build"
}
```

The netlify.toml uses `pnpm install && pnpm build` to:
1. Install dependencies (Netlify may not cache node_modules)
2. Run Turborepo build pipeline (builds both apps)

### Static Export Output Directories

**Source:** `turbo.json` and app configurations
**Apply to:** Netlify site publish directories

| App | Output Directory | Config Source |
|-----|-----------------|---------------|
| Generator | `apps/generator/out/` | `next.config.ts`: `distDir: 'out'` |
| Mobile | `apps/mobile/dist/` | Expo default with `expo export --platform web` |

### Node Version Consistency

**Source:** README.md + netlify.toml
**Apply to:** `.nvmrc`, Netlify build environment

- README specifies Node 18+
- Netlify default is Node 18
- Use Node 20 LTS for best compatibility with Expo SDK 56
- Specify in `.nvmrc` for local development and `NODE_VERSION` in netlify.toml

---

## No Analog Found

All files have patterns derived from existing configuration and documentation. No files require new patterns without precedent.

---

## Infrastructure Notes

### Netlify Site Setup (Manual Steps)

These are configuration steps in Netlify UI, not code files:

1. **Create two Netlify sites:**
   - `trivial-world-game.netlify.app` — connect to GitHub repo
   - `trivial-world-generator.netlify.app` — connect to same GitHub repo

2. **Configure each site in Netlify UI:**
   - Build command: `pnpm install && pnpm build`
   - Publish directory: `apps/mobile/dist` (game) or `apps/generator/out` (generator)
   - Branch: `main`
   - Auto-deploy: enabled

3. **SPA Redirects:**
   - Each app includes `_redirects` file in output (copied from `public/`)
   - No configuration needed in Netlify UI

### GitHub Integration

- Netlify connects to GitHub repository once per site
- Auto-deploys on push to `main` branch
- PR previews enabled by default

### Build Verification

From RESEARCH.md validation section:
- Build succeeds: `pnpm build && ls apps/generator/out/index.html && ls apps/mobile/dist/index.html`
- SPA redirects: `curl https://site.netlify.app/some-route` returns 200 with HTML

---

## Metadata

**Analog search scope:**
- `package.json` (root) — build scripts
- `turbo.json` — Turborepo pipeline
- `apps/generator/next.config.ts` — Next.js static export
- `apps/mobile/app.config.js` — Expo web configuration
- `apps/mobile/package.json` — build:web script
- `README.md` — Node version requirements

**Files scanned:** 6 configuration files
**Pattern extraction date:** 2026-06-09

---

## Implementation Checklist

Files to create:

- [ ] `netlify.toml` at repository root
- [ ] `apps/generator/public/_redirects`
- [ ] `apps/mobile/public/_redirects`
- [ ] `.nvmrc` at repository root

Files to modify:

- [ ] `apps/mobile/package.json` — update `build:web` script to copy `_redirects`

Manual configuration:

- [ ] Create Netlify site for game app (`trivial-world-game`)
- [ ] Create Netlify site for generator app (`trivial-world-generator`)
- [ ] Connect GitHub repository to both sites
- [ ] Configure publish directories in Netlify UI