# Phase 10: Netlify Deployment - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **automatic deployment of both apps to Netlify via GitHub sync** — enabling the game app and generator app to be accessible on the web with HTTPS and deep linking support.

**In scope:**
- Netlify site creation for game app and generator app
- GitHub integration for automatic deployment on push to main
- Root netlify.toml configuration for monorepo builds
- SPA redirect configuration for client-side routing
- HTTPS enforcement (Netlify default)
- Preview deployments for pull requests

**Out of scope:**
- PWA manifest and icons (Phase 11)
- Custom domain configuration (future decision)
- IndexedDB persistence (deferred)
- Server-side functions (both apps are static)
- Ollama hosting (dev-only, users run locally)

</domain>

<decisions>
## Implementation Decisions

### Site Naming

- **D-01:** Two separate Netlify sites per D-03 from Phase 9. Site names: `trivial-world-game.netlify.app` (game app) and `trivial-world-generator.netlify.app` (generator app). Clear separation, follows prior decision.

### Deployment Configuration

- **D-02:** Single root `netlify.toml` at monorepo root. One source of truth for both sites. Simpler monorepo management.

- **D-03:** Root build with Turborepo caching. Netlify runs `pnpm install && pnpm build` at root. Turborepo handles dependency graph and incremental builds automatically. No Remote Cache needed — local caching is sufficient.

- **D-04:** Separate build contexts in netlify.toml for game app and generator app. Each app specifies its own publish directory (`apps/mobile/dist/` for game, `apps/generator/out/` for generator).

### Preview Deployments

- **D-05:** Enable PR previews for both sites. Every pull request gets a preview URL for testing before merge. Uses Netlify build minutes but catches issues early.

### Environment Variables

- **D-06:** No production environment variables needed for v3.0. Both apps are static sites with no server-side state.

- **D-07:** OLLAMA_HOST is client-side configuration (not a production env var). Users run Ollama locally and configure the endpoint in the generator app UI. Generator makes client-side requests to the user's Ollama instance.

- **D-08:** Analytics/monitoring deferred to future. Can add environment variables via Netlify UI later without code deployment.

### SPA Redirects

- **D-09:** Both apps use client-side routing and need SPA redirects. Add `/* /index.html 200` rewrite rules for both apps in netlify.toml. Expo Router (game) and Next.js App Router (generator) both require this for deep linking.

### HTTPS

- **D-10:** HTTPS enforced by Netlify default. No additional configuration needed. Netlify provides SSL certificates automatically.

### Claude's Discretion

- Exact netlify.toml structure (headers, redirects syntax)
- Build timeout configuration if needed
- Notification settings for deploy success/failure
- Branch protection rules for main (optional)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, core value, monorepo architecture
- `.planning/REQUIREMENTS.md` — GEN-01, GEN-02, NETL-01, NETL-02, NETL-03, PWA-02 requirements
- `.planning/ROADMAP.md` — Phase 10 definition and success criteria
- `.planning/STATE.md` — v3.0 decisions (D-03: two separate Netlify sites)

### Prior Phase Context
- `.planning/phases/07-question-generator-web-app/07-CONTEXT.md` — Generator app architecture, static export configuration (D-17)
- `.planning/phases/09-mobile-web-export/09-CONTEXT.md` — Game app web export, platform storage, native module degradation

### Build Configuration
- `apps/generator/next.config.ts` — Next.js static export config (`output: 'export'`, `distDir: 'out'`)
- `apps/mobile/package.json` — Build script: `"build:web": "expo export --platform web"`
- `apps/mobile/app.config.js` — Expo web config (`output: 'single'`, `bundler: 'metro'`)
- `package.json` — Root scripts: `"build": "turbo run build"`
- `turbo.json` — Turborepo pipeline configuration

### Key Code References
- `apps/generator/out/` — Generator static export output directory
- `apps/mobile/dist/` — Game app static export output directory

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Generator app already builds:** `pnpm build` at root runs `turbo run build`, which builds both apps
- **Static exports ready:** Generator `out/` folder and game `dist/` folder already generated
- **Monorepo structure:** Turborepo + pnpm workspaces already configured
- **No deployment config exists:** Clean slate for netlify.toml

### Established Patterns
- **Root-level builds:** `pnpm build` runs Turborepo pipeline
- **Turborepo caching:** Local cache in `.turbo/` directory, persisted between builds
- **App router routing:** Next.js App Router in generator (SPA routing)
- **Expo Router routing:** File-based routing in mobile app (SPA routing)

### Integration Points
- **New file: `netlify.toml`** at root with two build contexts
- **GitHub repository:** Need to connect to Netlify for auto-deploy
- **Netlify sites:** Two sites created via Netlify UI or CLI

### Critical Requirements
- **SPA redirects:** Both apps need `/* /index.html 200` rewrite for client-side routing
- **Build command:** `pnpm install && pnpm build` at root
- **Publish directories:** `apps/mobile/dist/` for game, `apps/generator/out/` for generator
- **Node version:** Must match project requirements (Node 18+)

</code_context>

<specifics>
## Specific Ideas

- Netlify.toml should have two contexts: one for game app (`[context.game]`) and one for generator app (`[context.generator]`)
- Alternatively, use two separate Netlify sites with the same repo but different base directories and publish directories
- Preview deployments should be enabled by default for PRs
- No environment variables in netlify.toml — both apps are static with client-side-only functionality
- HTTPS is automatic — no configuration needed
- Build output should show both apps building in the Turborepo pipeline

</specifics>

<deferred>
## Deferred Ideas

### Custom Domains
- game.trivialworld.com and generator.trivialworld.com
- Requires domain purchase and DNS configuration
- Can add later via Netlify UI without code changes

### Analytics/Monitoring
- Add environment variables for analytics services (e.g., Vercel Analytics, Sentry)
- Can configure via Netlify UI when needed
- Deferred to future phase

### Branch Protection
- Require PR reviews before merge to main
- GitHub settings, not Netlify
- Out of scope for this phase

### Deploy Notifications
- Slack/Discord notifications on deploy success/failure
- Netlify UI configuration
- Can add later without code changes

</deferred>

---

*Phase: 10-netlify-deployment*
*Context gathered: 2026-06-09*