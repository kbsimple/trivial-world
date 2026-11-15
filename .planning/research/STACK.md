# Technology Stack: v13.0 Game History and Question Feedback Backend

**Project:** Trivial World
**Researched:** 2026-11-14
**Scope:** Only NEW capabilities. Existing stack (Expo 56 web/PWA, Zustand 5, idb-keyval, SW, Tamagui, Expo Router, Turborepo + pnpm, Zod 4 in packages/types, vitest) is unchanged.

## RECOMMENDATION (one line)

**Netlify Functions (v2, Web-standard Request/Response) + Netlify Database (managed Neon-style Postgres) + Drizzle ORM + shared Zod from packages/types, with static bearer-token auth (env-var secrets) for admin and LLM access.** Stay on Netlify; add zero new vendors.

## Why this wins (comparison)

| Criterion | Netlify Functions + Netlify Database | Supabase | Vercel Fn + Postgres | Cloudflare Workers + D1 |
|---|---|---|---|---|
| New vendor/account | None (already on Netlify) | Yes | Yes, and second host | Yes, and second host |
| Fit with existing static deploy | Native: same site, same origin (/api/v1/...), no CORS for game | Separate origin; CORS | Would need to move or split hosting | Separate origin or move hosting |
| Monorepo ease | netlify/functions + netlify/database/migrations; deploys with existing build | Separate project, CLI migrations, keys to manage | Re-platform | wrangler + D1 bindings, separate deploy |
| Free tier | Free plan 300 credits/mo; DB: 1 compute unit, 48 CU/mo, 5 GB storage, sleeps after 5 min idle. Ample for hobby | 500 MB DB, but free projects PAUSE after inactivity (bad for hobby app played sporadically) | Hobby plan is non-commercial; Postgres via Marketplace (Neon) anyway | Most generous (D1 5 GB, 100k req/day) |
| Anonymous-client write protection | Built-in code rate limiting (free plan: 2 rules, per IP) + Zod validation in function | RLS with anon key exposes DB directly to the internet; abuse limits are DIY. Worse fit for "validate everything server-side" | Similar to Netlify | Good (WAF rate limits) but separate |
| Admin auth, single maintainer | Env-var token; no auth product needed | Supabase Auth works but adds accounts machinery for a one-person app | Same as Netlify | Cloudflare Access is excellent but extra setup |
| API key for LLM scripts | Env-var token, same code path | Service-role key is all-powerful (not scoped) | Same | Same |
| Local dev + vitest | `netlify dev` runs a local real Postgres; `@netlify/database-dev` gives in-memory real Postgres in vitest, no Docker | Needs Docker (supabase start) | Needs own Postgres | Miniflare/D1 local is good, but SQLite dialect |
| Migrations | Forward-only SQL in netlify/database/migrations, applied automatically before each production deploy; deploy previews get their own DB branch | supabase CLI migrations | drizzle-kit manual | wrangler d1 migrations |
| Zod sharing | Same TS runtime, import packages/types directly | Auto-API bypasses Zod unless wrapped in Edge Functions | Same as Netlify | Same (Workers) |
| Verdict | **Choose** | Overkill, pause risk, RLS-as-API is the wrong control point | Re-platform for no gain | Strong runner-up; reject only because it forces a second platform and SQLite dialect |

Runner-up trigger: if Netlify credit pricing becomes a problem (it should not at hobby scale), Cloudflare Workers + D1 + Hono is the cheapest escape hatch. Keeping handlers as plain `(Request) => Response` functions with the DB behind a small repository module keeps that migration cheap.

**Caveat (MEDIUM confidence):** Netlify Database is a newer product (docs do not state GA vs beta; Drizzle's native adapter is on Drizzle's pre-1.0 line). Docs do not say what happens when free credits are exhausted (site may pause). For a hobby app this is acceptable, but monitor the credit meter.

## Recommended Stack

### Backend runtime and database
| Technology | Version | Purpose | Why |
|---|---|---|---|
| Netlify Functions (v2 API) | via `@netlify/functions` ^6.1.1 | HTTP API at /api/v1/* on the game site | Web-standard `Request`/`Response`; `config.path` routing and `config.rateLimit` live in the function file; same origin as PWA. HIGH |
| Netlify Database | n/a (managed) | Postgres for games, question outcomes, feedback | Auto-provisioned when `@netlify/database` is installed; migrations applied on deploy; per-preview branches; local Postgres under `netlify dev`. HIGH (docs.netlify.com/build/data-and-storage/netlify-database) |
| `@netlify/database` | ^2.0.3 | Connection/driver (`getConnectionString()`, `NETLIFY_DB_URL`) | Official driver package. HIGH |
| `@netlify/database-dev` (dev) | latest | Real in-memory Postgres in vitest | `new NetlifyDB().start()` + `applyMigrations('./netlify/database/migrations')`; no Docker. HIGH |

### ORM / query layer
| Technology | Version | Purpose | Why |
|---|---|---|---|
| `drizzle-orm` | pin `1.0.0-rc.5` (npm tag `rc`; `latest` is 0.45.4) | Typed schema + queries | Netlify's own docs show `drizzle-orm/netlify-db` adapter and `drizzle-kit generate` with `out: "netlify/database/migrations"`. That adapter is only on the 1.0 pre-release line (docs say `@beta`; `rc` tag is newer). MEDIUM |
| `drizzle-kit` (dev) | pin `1.0.0-rc.5` (match orm) | Generate SQL migrations | Emits `<ts>_<slug>/migration.sql`, which matches Netlify's accepted folder format. MEDIUM |
| `drizzle-zod` / `drizzle-orm/zod` | skip | n/a | DB tables are not the wire contract; hand-write Zod in packages/types (see below). |

**Why Drizzle over Kysely/raw:** schema-as-code that generates the migration SQL Netlify applies, an official Netlify adapter and docs path, and aggregate queries (per-question stats: counts, correct-rate, group by) are easy in either. Kysely (0.29.9) is stable and fine, but has no schema/migration generation, so you would hand-write SQL migrations and keep types in sync manually. **Fallback if the rc line proves flaky:** hand-written SQL migrations in netlify/database/migrations + `@netlify/database` + raw parameterized SQL (or Kysely 0.29.x over `pg`). Do not use `drizzle-orm@0.45` (no Netlify adapter; would need `pg`/neon driver glue).

### Shared contracts (packages/types)
| Item | Version | Purpose | Why |
|---|---|---|---|
| `zod` | ^4 (already) | Wire schemas: `GameSummaryUpload`, `QuestionOutcome`, `FeedbackSubmission` (reason enum + optional note, max length), `ReviewExport`, `ReviewDecision` | Single source: client validates before enqueueing, function validates on receipt (`.strict()`, array/length caps), admin UI and LLM script reuse types. |

Add new files under packages/types (e.g. `src/telemetry.ts`) and export from index. Client-generated `gameId` / `feedbackId` UUIDs (crypto.randomUUID) are part of the schema and enable idempotent retries.

### Client-side (apps/mobile)
| Item | Version | Purpose | Why |
|---|---|---|---|
| idb-keyval | 6.2.5 (already) | Outbox queue store (a dedicated `createStore('tw-outbox','queue')`) | Already in repo; no new dependency. Use plain `fetch` flush on app start, `online` event, and after each game ends. |
| Service Worker Background Sync | optional | Retry when tab closed | Not supported on iOS Safari; do NOT depend on it. Foreground flush (start, `online`, visibilitychange) is the reliable path. |

No new client libraries: no TanStack Query, no workbox-background-sync, no Dexie.

### Admin + programmatic access
| Item | Purpose | Why |
|---|---|---|
| `ADMIN_TOKEN` (Netlify env var, secret) | Admin UI bearer token | Single maintainer; admin page prompts for the token, keeps it in sessionStorage, sends `Authorization: Bearer`. Verified server-side with `crypto.timingSafeEqual` on SHA-256 digests. No cookies means no CSRF. |
| `REVIEW_API_TOKEN` (separate env var) | LLM batch-review scripts (`GET /api/v1/admin/review/export`, `POST .../review/decisions`) | Separate secret from admin so it can be rotated/revoked independently; same middleware, scoped to review routes only. Rotate by changing env var and redeploying. |
| Rate limit on admin/review routes | Brute-force protection | Free plan allows 2 code-based rate-limit rules total: one for public ingest, one for admin/review. Plan the function layout around that cap (see below). |

Do NOT add: Netlify Identity (deprecated), Auth.js/Clerk/Supabase Auth, OAuth, a users table, JWT libraries, or Netlify site-wide password protection (paid plan feature). A static secret is the simplest thing that is actually secure for one maintainer over HTTPS. Upgrade path if ever needed: Cloudflare Access / GitHub OAuth in front of the admin route.

Where to put the admin page: **apps/generator** (already the maintainer-only tool, not shipped to players, no Tamagui/bundle cost). It is a different origin than the game site, so admin/review endpoints need a CORS allowlist for the generator origin plus OPTIONS handling (bearer token, no credentials mode). If that CORS overhead is unwanted, the alternative is an unlinked `/admin` Expo Router route with `noindex`, which is same-origin but ships admin code in the player bundle. Roadmap should decide; recommendation is generator.

### Supporting libraries
| Library | Version | Purpose | When |
|---|---|---|---|
| `pg` | only if Drizzle adapter route fails | Direct driver | Fallback only |
| `@netlify/dev` (dev) | latest | `NetlifyDev` class for end-to-end function tests | Optional; unit-test handlers as plain functions first |
| Hono | skip | Router | Not needed: ~6 endpoints; use one function file per route group with `config.path` |

## Suggested function layout (respects 2 rate-limit rules)
- `netlify/functions/ingest.ts`, paths `/api/v1/ingest/games` and `/api/v1/ingest/feedback` (public, anonymous). Rate limit rule 1 (e.g. 60/min per IP). Zod `.strict()`, payload byte cap (reject >64 KB), `INSERT ... ON CONFLICT (id) DO NOTHING` for idempotency; return 200/202 on duplicates so client clears queue.
- `netlify/functions/admin.ts`, path `/api/v1/admin/*` (token-gated: stats, flagged list, resolve/dismiss, review export/decisions). Rate limit rule 2 (e.g. 30/min per IP).
- Keep logic in `netlify/lib/` (handlers take validated input + db, return plain objects) so vitest tests them against `@netlify/database-dev` with no HTTP.

## Monorepo integration points (verify in phase 1)
- Repo-root netlify.toml is shared by the game and generator sites (publish dir set in UI). `netlify/functions` and `netlify/database/migrations` at repo root would be picked up by BOTH sites if both use repo root as base. Attach the database and functions to the **game site only**; confirm Netlify's handling of functions/migrations dir when the site has a base directory or shared toml. Docs do not cover monorepo base dirs for migrations (flagged gap). Fast check: deploy a trivial migration to a deploy preview.
- Add `[functions] node_bundler = "esbuild"`; bump `NODE_VERSION` from 20 if `@netlify/database` requires newer (check engines; Node 20 is at/near EOL by now).
- Functions import `@trivial-world/types`, which builds to `dist` via tsc: ensure Turbo builds types before functions bundle (existing `pnpm build` ordering should already do this).
- Existing static `/api/v1/packs.json` coexists with function paths under `/api/v1/...`; keep path namespaces distinct and make sure the SW does not cache POSTs or /api/v1/admin/*.
- Security headers in netlify.toml already apply; add `Cache-Control: no-store` on admin/review responses.

## Installation

```bash
# repo root (functions + migrations live here)
pnpm add -w @netlify/functions @netlify/database drizzle-orm@1.0.0-rc.5 @trivial-world/types@workspace:*
pnpm add -wD drizzle-kit@1.0.0-rc.5 @netlify/database-dev netlify-cli
# types package: no new deps (zod already)
# mobile: no new deps
```
(Alternatively give the backend its own `apps/api` or `packages/db` workspace for schema and handlers, with only `netlify/` thin entrypoints at root. Recommended for clean vitest config.)

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({ dialect: "postgresql", schema: "./db/schema.ts", out: "netlify/database/migrations" });
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|---|---|---|---|
| Backend | Netlify Functions + Netlify Database | Supabase | Pausing free projects; RLS-from-anon-client is a weaker abuse model than a validating function; extra vendor/keys; Docker for local |
| Backend | same | Vercel + Marketplace Postgres | Would split or move hosting; Hobby tier is non-commercial; no gain |
| Backend | same | Cloudflare Workers + D1 | Best free tier, but second platform, SQLite dialect, separate deploy/CORS. Keep as escape hatch |
| ORM | Drizzle rc | Kysely 0.29.9 | No migration generation; still a fine fallback |
| ORM | Drizzle rc | Raw SQL | Fine for ~5 tables; loses type-safe aggregates. Acceptable fallback |
| Admin auth | Env-var bearer token | Netlify Identity / Supabase Auth / OAuth | Accounts machinery for one user; Identity deprecated |
| Anti-abuse | Netlify rate limit + Zod caps + idempotent IDs | CAPTCHA / Turnstile | Hurts offline-first and social UX; revisit only if spam appears |
| Sync | Foreground flush from idb-keyval outbox | Workbox/Background Sync | iOS Safari lacks Background Sync |

## What NOT to add
- Any auth provider, users/accounts table, sessions, cookies, or JWT lib.
- Network dependency in gameplay path: all recording writes go to the IndexedDB outbox first, flush is fire-and-forget with exponential backoff.
- Supabase/Firebase SDKs in the client bundle.
- drizzle-orm 0.45.x (no Netlify adapter) mixed with 1.0 rc.
- Per-answer PII: no player names, device fingerprints, or IPs stored; only anonymous per-game UUIDs.

## Confidence
| Area | Level | Notes |
|---|---|---|
| Netlify Database features, migrations, local/vitest | HIGH | Official Netlify docs fetched 2026-11 |
| Free-tier numbers | MEDIUM | Docs list DB limits; exhaustion behavior and function credit cost not documented |
| Drizzle rc + netlify-db adapter | MEDIUM | Docs say `@beta`; npm `rc` tag is 1.0.0-rc.5; there was a `revert-netlify` dist-tag on beta.23, so verify `drizzle-orm/netlify-db` exists in the pinned rc in a spike, else use fallback |
| Monorepo/base-dir behavior for migrations | LOW | Undocumented; spike needed |
| Comparison of competitors' free tiers | MEDIUM | From general knowledge; Supabase pause policy and Vercel Hobby terms not re-verified this session |

## Sources
- https://docs.netlify.com/build/data-and-storage/netlify-database/getting-started/
- https://docs.netlify.com/build/data-and-storage/netlify-database/tooling/
- https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/
- https://docs.netlify.com/build/data-and-storage/netlify-database/local-development/
- https://docs.netlify.com/build/data-and-storage/netlify-database/billing-and-usage/
- https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
- npm registry (queried 2026-11-14): @netlify/functions 6.1.1, @netlify/database 2.0.3, drizzle-orm latest 0.45.4 / rc 1.0.0-rc.5, drizzle-kit rc 1.0.0-rc.5, kysely 0.29.9, vitest 5.1.0 (repo pins ^3; no change needed)
