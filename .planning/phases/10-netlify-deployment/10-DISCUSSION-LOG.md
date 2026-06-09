# Phase 10: Netlify Deployment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-09
**Phase:** 10-netlify-deployment
**Areas discussed:** Site naming strategy, Build configuration, Preview deployments, Environment variables

---

## Site Naming Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Netlify subdomains | Game: trivial-world-game.netlify.app, Generator: trivial-world-generator.netlify.app. Simple, no custom domain needed. | ✓ |
| Custom domain subdomains | Use a custom domain with subdomains: game.trivialworld.com and generator.trivialworld.com. Requires owning the domain and configuring DNS. | |
| Mix: apex + subdomain | Game: trivial-world.netlify.app (main domain), Generator: generator.trivialworld.com. One app on subdomain, other on apex. Mixes approaches. | |

**User's choice:** Netlify subdomains (recommended)
**Notes:** Clear separation, follows D-03 decision from Phase 9. Exact names: trivial-world-game.netlify.app and trivial-world-generator.netlify.app.

---

## Build Configuration

### Config Location

| Option | Description | Selected |
|--------|-------------|----------|
| Root netlify.toml (recommended) | Single netlify.toml at root handling both sites with build contexts. Clearer for monorepo, one source of truth. | ✓ |
| Per-app netlify.toml | Separate netlify.toml in apps/mobile and apps/generator. Each app owns its deploy config. More files to maintain. | |
| Netlify UI only (no files) | Configure builds in Netlify UI, no netlify.toml files. Works for simple cases, but config is lost if site is deleted. | |

**User's choice:** Root netlify.toml (recommended)
**Notes:** One source of truth for the monorepo. Cleaner for Turborepo build context.

### Build Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Root build with Turbo caching (recommended) | Netlify runs 'pnpm install && pnpm build' at root. Turborepo handles caching and incremental builds automatically. Simpler, uses Turborepo's built-in smarts. | ✓ |
| Turborepo Remote Cache | Enable Turborepo Remote Cache for Netlify to share build artifacts across deployments. Faster rebuilds after first deploy, but requires Turbo account. | |

**User's choice:** Root build with Turbo caching (recommended)
**Notes:** Uses Turborepo's built-in local caching. No Remote Cache needed — simpler setup.

---

## Preview Deployments

| Option | Description | Selected |
|--------|-------------|----------|
| Enable PR previews (recommended) | Every PR gets a preview URL. Great for testing changes before merge. Uses Netlify build minutes per PR. | ✓ |
| Production only (no previews) | Only main branch deploys. Simpler, fewer build minutes, but no way to test before merge. | |

**User's choice:** Enable PR previews (recommended)
**Notes:** Both game app and generator app get preview URLs for every PR.

---

## Environment Variables

| Option | Description | Selected |
|--------|-------------|----------|
| OLLAMA_HOST (generator app) | Generator app needs to know where Ollama is running. For v3.0, this stays local-only (users run Ollama locally). No production env var needed. | ✓ |
| Analytics/monitoring (future) | For usage analytics or error tracking. Can add later without code deploy via Netlify UI. | ✓ (future) |
| None needed for v3.0 | v3.0 is static sites with no server-side state. No secrets needed. Generator calls Ollama client-side from user's browser. | ✓ |

**User's choice:** All three selected
**Notes:**
- OLLAMA_HOST is client-side configuration (not a production env var). Users run Ollama locally and configure in the generator UI.
- Analytics/monitoring deferred to future — can add env vars via Netlify UI later.
- No secrets needed for v3.0 — both apps are fully static.

---

## Claude's Discretion

- Exact netlify.toml structure (headers, redirects syntax)
- Build timeout configuration if needed
- Notification settings for deploy success/failure
- Branch protection rules for main (optional)

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Discussion completed: 2026-06-09*