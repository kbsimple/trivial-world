# Phase 25: Backend Foundation & Contracts - Research

**Researched:** 2026-11-17
**Domain:** Netlify Functions v2 + Netlify Database (Postgres) in a pnpm/Turborepo monorepo; Zod contracts; hermetic testing
**Confidence:** MEDIUM-HIGH (Netlify/Drizzle facts verified against current docs and the npm tarball; monorepo base-dir behavior, preview-branch writes and rate-limit rule accounting remain unproven until the spike)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
**Infrastructure & Deployment**
- Backend logic (handlers, validation glue, repository, DB client) lives in a NEW workspace package `packages/api`; thin Netlify Functions v2 entrypoints in `apps/mobile/netlify/functions/` (game site base dir is `apps/mobile`, which has its own `netlify.toml`) import from it. No separate Netlify site, no CORS for the game.
- DB access: Drizzle ORM + drizzle-kit pinned `1.0.0-rc.5` IF the first plan's spike confirms the `drizzle-orm/netlify-db` adapter exists and works; otherwise hand-written SQL migrations in Netlify's migrations folder + Kysely. Do not mix in drizzle-orm 0.45.
- Netlify setup (link the game site, install/provision `@netlify/database`, set env secrets) is executed by Claude via Netlify CLI, confirming with the user before each outward-facing step (link, provisioning, env:set, deploy/push). Capture the steps as an executable project skill `.claude/skills/tw-backend-setup/SKILL.md`.
- Bump `NODE_VERSION` 20 -> 22 in `apps/mobile/netlify.toml` (and root `netlify.toml`) — Node 20 EOL.

**API Contract & Abuse Protection**
- Endpoints this phase: `POST /api/v2/games`, `POST /api/v2/feedback`, `GET /api/v2/health`.
- Responses: `201` on new record; `200` with identical body on replay of an existing client ID (idempotent, `ON CONFLICT DO NOTHING`); `400` with concise Zod issue summary; `413` oversized; `429` rate limited.
- Rate limiting: one Netlify code-based rule per IP, 60 req/min, across public ingest. Reserve the second free-plan rule for admin/review (Phases 29-30).
- Caps: body <= 64 KB, <= 500 outcomes per game, note <= 500 chars, `.strict()` schemas reject unknown fields.
- `installId` is a UUID field in the request body (not a header). Pack IDs validated as UUID format only — no known-packs check at write time.
- A game record (game + seats + outcomes) is ONE request and ONE transaction. `feedback.game_id` is a soft reference (no FK). Enums as `text + CHECK`. Server sets `received_at`. Player names never accepted (seat indexes only).
- Contracts include `schemaVersion`; server accepts current version.

**Testing, CI Gates & Status**
- Handlers take an injected repository interface. Unit tests use an in-memory fake repo -> default `npx vitest run` needs no DB. Real-Postgres integration tests run via separate `pnpm test:integration` using `@netlify/database-dev`; excluded from the default gate. DB clients created lazily, never at import time.
- Secret scan: `apps/mobile/scripts/check-secrets.mjs` appended to the end of `pnpm build` / `build:web`; fails if `dist/` contains server secret names or (when present in env) values: `DATABASE_URL`, `NETLIFY_DB_*`, `ADMIN_TOKEN`, `REVIEW_API_TOKEN`. Netlify build is the CI gate (no GitHub Actions).
- `/statusz` becomes a Netlify Function that merges build-time `statusz.json` with a live DB check (`ok|down` + latency). `/statusz.json` stays static. Update `_redirects` accordingly; ensure `/api/v2/*` is not swallowed by the SPA catch-all and that functions take precedence.
- Deploy-preview isolation: rely on Netlify Database per-deploy-preview branches; verify during the spike by writing from a preview and confirming production is untouched. If isolation can't be proven, previews get no DB access.

### Claude's Discretion
- Exact table/column naming, index choices, Zod schema file layout in `packages/types`, migration file naming, health payload shape.

### Deferred Ideas (OUT OF SCOPE)
- SW `NetworkOnly` for `/api/v2/*` -> Phase 26 (SYNC-05)
- Admin/review auth middleware usage -> Phases 29-30 (token compare helper may be scaffolded here)
- GitHub Actions CI -> not planned
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BACK-01 | Same-origin `/api/v2/*` via Netlify Functions + Database without breaking `/api/v1/packs.json` or SPA catch-all | Functions run BEFORE redirects/static in the request chain; functions dir resolves relative to base dir; `config.path` routing (Architecture, Pitfalls 1-2) |
| BACK-02 | Shared `.strict()` size-capped Zod contracts with `schemaVersion` in `packages/types` | Zod 4.6.7 in repo; `z.strictObject`; contract layout (Code Examples) |
| BACK-03 | Versioned migrations applied on deploy; previews never write prod DB | `netlify/database/migrations` auto-applied pre-publish (prod) / per-deploy (preview) on a preview DB branch (Standard Stack, Spike) |
| BACK-04 | Reject invalid/oversized; rate limit | `config.rateLimit` (free plan: 2 code rules, per IP+domain, 429), body cap helper, Zod |
| BACK-05 | `/statusz` shows DB reachability | `/statusz` function with `config.path`; self-fetch `/statusz.json` + `SELECT 1` |
| BACK-06 | CI fails if server secret in `dist/` | `check-secrets.mjs` appended to build |
| BACK-07 | Default vitest hermetic; integration separate | Repo interface + fake; `@netlify/database-dev` in separate vitest config/script |
</phase_requirements>

## Summary

All documented Netlify mechanics needed by this phase exist today and match CONTEXT.md decisions. Functions live in `<base>/netlify/functions` (base = `apps/mobile`), run before redirects and static files in the request chain, and can be restricted to paths via `config.path`. Netlify Database auto-provisions on deploy when `@netlify/database` is installed, applies `netlify/database/migrations` immediately before publish (prod) or on every deploy (previews, on a per-preview DB branch copied from production data), and exposes `NETLIFY_DB_URL`. Code-based rate limiting is in the function's `config.rateLimit` (free plan: 2 rules, aggregated per IP+domain, returns 429, enforcement can lag up to 10 s).

The Drizzle spike gate resolves favourably on paper: `drizzle-orm@1.0.0-rc.5` (npm tag `rc`) ships a `netlify-db` entrypoint (`drizzle-orm/netlify-db`, built on `@neondatabase/serverless` Pool/neon, reads `NETLIFY_DB_URL` at call time, and switches to node-postgres when `NETLIFY_DB_DRIVER=server`). `drizzle-kit@1.0.0-rc.5` exists. The spike must still prove it works end-to-end on a deploy; the Kysely/raw-SQL fallback stays defined. `@netlify/database` 2.0.3 requires Node >=22.12 (NODE_VERSION 22 is mandatory, not just hygiene); Expo 56 itself requires Node ^22.13, so 22 is compatible.

Undocumented and therefore spike-mandatory: (a) whether `apps/mobile/netlify/database/migrations` is picked up when base dir is `apps/mobile` (docs never address base dirs), (b) preview-branch write isolation (docs say prod DB is accessed only by production deploys; branch-deploys are not mentioned), (c) whether one function with several `path` entries counts as one rate-limit rule, (d) GA/beta status of Netlify Database (not stated in docs).

**Primary recommendation:** Run the deploy-preview spike first (Wave 1, `autonomous: false`); only after it proves functions routing, migration application, preview DB isolation, and the `drizzle-orm/netlify-db` adapter, build contracts -> repo/handlers -> statusz/secret scan -> skill.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ingest endpoints (games, feedback) | API / Backend (Netlify Function) | Database | Validation, idempotency, rate limit at the server; anonymous clients |
| Wire contracts (Zod) | Shared package (`packages/types`) | API, later Browser | Single source for client pre-validation and server validation |
| Persistence, migrations | Database (Netlify Database) | API | Migrations run by the platform on deploy |
| Rate limiting | CDN/Edge (Netlify rule in `config`) | API (body cap) | Platform enforces per-IP before function cost |
| `/statusz` merge | API (function) | CDN static (`statusz.json`) | Needs live DB probe; static file stays as build-time source |
| Secret leak gate | Build (script at end of `pnpm build`) | — | Scans `dist/` before deploy publishes |
| SPA/static serving | CDN / Static | — | Must be untouched; functions only claim `/api/v2/*` and `/statusz` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@netlify/database` | 2.0.3 (engines node >=22.12.0) | Auto-provision DB, `getDatabase()`, `getConnectionString()` | Official; install triggers provisioning [VERIFIED: npm view; CITED: docs.netlify.com/build/data-and-storage/netlify-database/getting-started] |
| `@netlify/functions` | 6.1.1 | `Config`/`Context` types for v2 functions | Official [VERIFIED: npm view] |
| `drizzle-orm` | `1.0.0-rc.5` (tag `rc`; `latest` = 0.45.4) | Typed queries; `drizzle-orm/netlify-db` adapter | Tarball contains `netlify-db/{driver,session,migrator,codecs}`; exports map `./*` [VERIFIED: npm pack + inspected tarball] |
| `drizzle-kit` | `1.0.0-rc.5` (dev) | Generate SQL migrations to Netlify folder | Netlify doc config `out: "netlify/database/migrations"` [CITED: .../tooling] [VERIFIED: npm view] |
| `@neondatabase/serverless` | `^1.1.0` | Peer of the netlify-db adapter (optional peer in drizzle; pnpm will NOT hoist it) | Adapter imports `Pool, neon` from it; add explicitly to `packages/api` [VERIFIED: tarball driver.js] |
| `zod` | ^4 (repo has ^4.0.0; registry 4.6.7) | Contracts | Already in `packages/types` [VERIFIED: package.json, npm view] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@netlify/database-dev` | 1.0.2 (engines node >=22.12) (dev) | Real in-memory Postgres for integration tests | `pnpm test:integration` only [VERIFIED: npm view; CITED: .../local-development] |
| `pg` | ^8 (dev, in `packages/api`) | Test client + `NETLIFY_DB_DRIVER=server` path | Integration tests [CITED: drizzle driver.js] |
| `netlify-cli` | 26.1.0 (already installed globally) | link, `database status/migrations`, `env:set`, deploy | Spike + skill |
| `kysely` | 0.29.9 | FALLBACK only | If spike rejects Drizzle rc [VERIFIED: npm view] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle rc.5 | Hand SQL migrations + `getDatabase().pool` + Kysely | No schema-as-code; fully stable; use only if spike fails (locked decision) |
| Self-fetch `/statusz.json` | `included_files = ["dist/statusz.json"]` | Avoids a network hop, but path resolution inside bundled function is unverified; spike picks one |

**Installation (after spike go):**
```bash
pnpm --filter @trivial-world/api add @netlify/database drizzle-orm@1.0.0-rc.5 @neondatabase/serverless @trivial-world/types@workspace:*
pnpm --filter @trivial-world/api add -D drizzle-kit@1.0.0-rc.5 @netlify/database-dev pg @types/pg
pnpm --filter mobile add -D @netlify/functions   # types for entrypoints
pnpm --filter mobile add @trivial-world/api@workspace:*
```
Package names verified on npm; `@netlify/*` and `drizzle-*` are first-party/well-known and discovered via official Netlify/Drizzle docs. Prefer `netlify database init` (interactive; `--yes` for defaults) over manual install if the user approves, but it assumes a linked project and runs in `apps/mobile` — confirm it does not scaffold into the repo root.

## Package Legitimacy Audit

slopcheck could not be reliably installed/run in this session (not attempted via pip; registry checks only). Per protocol, registry-only evidence confers no `[VERIFIED]` for packages found outside authoritative docs. All packages below were named in official Netlify/Drizzle documentation (authoritative), registry versions confirmed; nonetheless the planner should gate the first install behind the existing spike checkpoint (which is `autonomous: false` anyway).

| Package | Registry | Source | Disposition |
|---------|----------|--------|-------------|
| @netlify/database, @netlify/functions, @netlify/database-dev | npm | Netlify official docs, 2.0.3 / 6.1.1 / 1.0.2 | Approved (docs-cited); slopcheck [ASSUMED] not run |
| drizzle-orm, drizzle-kit | npm | Drizzle + Netlify docs, rc.5 | Approved (docs-cited); slopcheck not run |
| @neondatabase/serverless, pg, kysely | npm | Peer dep in drizzle tarball / widely known | Approved; slopcheck not run |

**Removed [SLOP]:** none. **Flagged [SUS]:** none evaluated. Postinstall scripts not inspected (`npm view <pkg> scripts.postinstall` should be run by the planner's spike task for `@netlify/database` and `@netlify/database-dev`).

## Architecture Patterns

### System Architecture Diagram
```
Phone (PWA)                           Netlify (game site, base=apps/mobile)
  fetch POST /api/v2/games  ──►  [rate limit rule: 60/min per IP+domain, 429]
  fetch POST /api/v2/feedback ─►        │
                                         ▼
                              functions/ingest.mts  (config.path=[games,feedback], rateLimit)
                                 │ size gate (Content-Length + stream cap -> 413)
                                 │ JSON parse -> Zod strictObject (-> 400)
                                 ▼
                           packages/api handlers (repo injected)
                                 │ ON CONFLICT DO NOTHING in 1 txn -> 201 / 200
                                 ▼
                           lazy DB client (drizzle netlify-db / pg pool via NETLIFY_DB_URL)
                                 ▼
                  Netlify Database  (prod DB | per-deploy-preview branch)
GET /api/v2/health ─► functions/health.mts (no rate rule) ─► SELECT 1
GET /statusz ─► functions/statusz.mts ─► fetch /statusz.json (static) + SELECT 1 ─► merged JSON
Everything else ─► functions skipped ─► _redirects ─► static/SPA (/* /index.html 200)
```

### Recommended Project Structure
```
apps/mobile/
  netlify.toml                      # NODE_VERSION=22, [functions] node_bundler="esbuild"
  netlify/functions/{ingest,health,statusz}.mts   # thin: import handler from @trivial-world/api
  netlify/database/migrations/<n>_<slug>/migration.sql  # Netlify-applied (location to be proven by spike)
  scripts/check-secrets.mjs
packages/api/
  src/{handlers/,repo.ts,repo.memory.ts,repo.drizzle.ts,db.ts,schema.ts,http.ts,rate/token.ts}
  drizzle.config.ts   # out: ../../apps/mobile/netlify/database/migrations
  vitest.config.ts + vitest.integration.config.ts
packages/types/src/{ingest.ts (game record, feedback), review.ts (export/decisions)}
```

### Pattern 1: thin v2 entrypoint
```ts
// apps/mobile/netlify/functions/ingest.mts
import type { Config } from '@netlify/functions';
import { handleIngest } from '@trivial-world/api';
export default (req: Request) => handleIngest(req);
export const config: Config = {
  path: ['/api/v2/games', '/api/v2/feedback'],
  method: ['POST'],            // OPTIONS/GET => 405 from function
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
// Source: docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting + /build/functions/configuration
```
Keep `/api/v2/health` and `/statusz` in SEPARATE function files with no `rateLimit` so they do not consume the ingest rule and the second free rule stays reserved.

### Pattern 2: body cap (413)
```ts
export async function readCappedJson(req: Request, max = 64 * 1024) {
  const len = Number(req.headers.get('content-length') ?? NaN);
  if (Number.isFinite(len) && len > max) return { error: 413 as const };
  const reader = req.body?.getReader(); if (!reader) return { error: 400 as const };
  const chunks: Uint8Array[] = []; let total = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break;
    total += value.byteLength; if (total > max) { await reader.cancel(); return { error: 413 as const }; }
    chunks.push(value); }
  try { return { json: JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))) }; }
  catch { return { error: 400 as const }; }
}
```
Content-Length may be absent/chunked, so the stream cap is authoritative. Netlify's own sync payload limit (~6 MB) is far above 64 KB, so this must be done in code. [ASSUMED: limit size; standard Web Streams pattern]

### Pattern 3: lazy DB client (no import-time connect; hermetic)
```ts
let _db: ReturnType<typeof create> | undefined;
export const getDb = () => (_db ??= create());
function create() { const { drizzle } = require('drizzle-orm/netlify-db'); return drizzle({ schema }); } // reads NETLIFY_DB_URL at call time
```
Use a dynamic `await import('drizzle-orm/netlify-db')` inside `getDb()` in ESM; unit tests inject the in-memory repo and never import it.

### Pattern 4: contracts (Zod 4)
```ts
// packages/types/src/ingest.ts
import { z } from 'zod';
const uuid = z.uuid();                         // RFC 4122 v1-8 variant check in Zod 4
export const GameRecordSchema = z.strictObject({
  schemaVersion: z.literal(1),
  installId: uuid, gameId: uuid,
  status: z.enum(['finished', 'abandoned']),
  startedAt: z.iso.datetime(), endedAt: z.iso.datetime(),
  seats: z.array(z.strictObject({ seat: z.number().int().min(0).max(7), ... })).max(8),
  outcomes: z.array(OutcomeSchema).max(500),
});
export const FeedbackSchema = z.strictObject({ schemaVersion: z.literal(1), installId: uuid, feedbackId: uuid,
  packId: uuid, questionId: z.string().regex(/^[a-z0-9-]+$/).max(100), contentHash: z.string().max(64),
  gameId: uuid.optional(), reason: z.enum([...]), note: z.string().max(500).optional() });
```
In Zod 4 `z.strictObject()` is the primary API; `.strict()` still works (deprecated) — CONTEXT.md says `.strict()` schemas; either satisfies. `z.uuid()` in v4 is RFC-4122-strict (version and variant nibbles), matching the repo's pack-ID rule; use `z.guid()` only if you want loose. [CITED: zod.dev/api] [ASSUMED re: exact v4.6 helper names; verify with a unit test]
`packages/types` builds with `tsc` to `dist` (NodeNext); add the new files to `src/index.ts` exports. Functions bundle from `dist`, so the types build must precede function bundling — Netlify bundles functions after the build command, so `pnpm build` (turbo) ordering suffices; add `dependsOn: ["^build"]` for `build` in `turbo.json` if `apps/mobile` build ever needs types freshly built (currently not set; `mobile#build` tests already import dist). `packages/api` should export TS source (`"exports": {".": "./src/index.ts"}`): esbuild bundles it via workspace symlink and vitest reads it directly with no build step. [ASSUMED: verify in spike]

### Anti-Patterns to Avoid
- DB connection or `drizzle()` at module import (breaks hermetic tests and cold start; `drizzle()` throws if `NETLIFY_DB_URL` unset).
- Putting `/api/v2/*` behind a `_redirects` proxy rule: functions run before redirects; no redirect needed.
- Counting health/statusz in the ingest rate rule.
- Mixing `drizzle-orm@0.45` anywhere (workspace-wide pin of rc.5).
- Rate limit declared in `netlify.toml` for functions: unsupported ("Rate limits for functions can't be set in netlify.toml").
- `Cache-Control` via `_headers` for `/statusz`: the function must set its own `Cache-Control: no-store` (remove the stale `/statusz` stanza or leave harmless).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-IP rate limiting | In-function counters/Redis | `config.rateLimit` | Stateless functions; platform returns 429 |
| Migration runner | Custom apply script | Netlify auto-apply from `netlify/database/migrations` | Applied pre-publish, failure blocks deploy |
| Test Postgres | Docker / pg-mem | `@netlify/database-dev` | Real Postgres, no Docker |
| UUID validation | Regex | `z.uuid()` | RFC-4122 version/variant aware |
| Idempotency | Read-then-insert | `INSERT ... ON CONFLICT (id) DO NOTHING RETURNING` | Race-free |
| Token compare (scaffold) | `===` | `crypto.timingSafeEqual` over SHA-256 digests | Timing safety |

## Runtime State Inventory
Not a rename/refactor phase — omitted. (Exception: `/statusz` alias change in `_redirects`/`_headers` is a plain code edit; the SW has no `/statusz` route.)

## Common Pitfalls

### Pitfall 1: Migrations folder not found under base dir
**What goes wrong:** Netlify applies `netlify/database/migrations` but docs never say relative to what; it may be repo root, not `apps/mobile`. **Avoid:** Spike places a trivial migration in `apps/mobile/netlify/database/migrations`, deploys a preview, checks `netlify database status --branch <preview>`. If not found, try repo-root placement; keep drizzle.config `out` parameterized. **Signs:** table missing on preview; status shows no applied migrations.

### Pitfall 2: Drizzle-kit output format vs Netlify's `<number>_<slug>` rule
Netlify accepts `<number>_<slug>.sql` or `<number>_<slug>/migration.sql`. Drizzle-kit 1.0 emits `<ts>_<slug>/migration.sql` plus `snapshot.json` — verify the extra file does not fail the Netlify check; check the leading number is digits only. Never edit applied migrations (errors); use new migrations only. CHECK constraints for enums (`text + CHECK`) are not generated from `text()` columns — add `check()` in the Drizzle schema (supported in pg-core) or append raw SQL to the generated migration.

### Pitfall 3: Preview DBs contain a copy of prod data and previews are public
Writes are isolated (branch), but data is copied at preview creation. This phase stores no PII (seat indexes, UUIDs, no names/IPs), so acceptable; note in the skill. Docs say "production deploys are the only deploys that access the main database" but do NOT state what branch-deploys (non-PR branches) get. Spike must test both a PR deploy preview and a branch deploy; if branch deploys hit prod or are ambiguous, set `[context.branch-deploy]` to skip DB or set an env flag to make functions return 503 "backend disabled" (decision: "no proof -> no DB access").

### Pitfall 4: Function path vs statusz/redirect precedence
Functions beat redirects and static files unless `preferStatic: true`. `/statusz` function with `path: '/statusz'` therefore overrides the `_redirects` line `/statusz /statusz.json 200` (leave the redirect as a harmless fallback or delete it). `/statusz.json` is NOT claimed by any function -> static still served (needs `_headers` stanza kept). Do NOT use wildcard `/api/*` functions: `/api/v1/packs.json` is static. Use exact `/api/v2/...` paths. Spike verifies with `curl -i`.

### Pitfall 5: Rate limit accounting and lag
Free plan = 2 code rules per project; one function with `path` array is expected to be one rule (unverified). Enforcement can lag up to 10 s, so a burst test (e.g. 80 sequential curls) must assert >=1 `429`, not exactly N. All phones on venue Wi-Fi share one IP: 60/min is per IP+domain; Phase 26 client must backoff on 429 / honor Retry-After.

### Pitfall 6: Secrets in `dist/` and `EXPO_PUBLIC_`
Only `EXPO_PUBLIC_*` vars are inlined by Expo; scan must also cover names. Beware false positive: the scan string list is itself in `scripts/` (not in `dist/`), fine. Do not echo secret values in failure output (print names + file path only). Netlify exposes `NETLIFY_DB_URL` at build time, so value scanning works during the Netlify build; locally it is usually absent (skip value check, still do name check).

### Pitfall 7: pnpm workspace + esbuild bundling
`@neondatabase/serverless` and `ws` must resolve from `packages/api` (pnpm strictness); declare them there. `drizzle-orm` imports are bundled by esbuild; keep `node_bundler = "esbuild"` in `apps/mobile/netlify.toml`. If a native/ws dep fails to bundle use `external_node_modules`. `.mts` entrypoints with `"type"` mismatch: use `.mts` to force ESM.

### Pitfall 8: Hermetic gate leakage
`apps/mobile/vitest.config.ts` includes `**/*.test.ts` from its own dir only; `packages/api` tests are not run by `npx vitest run` at repo root unless a root vitest workspace exists. Decide how "`npx vitest run`" covers `packages/api` (see Validation Architecture): add root `vitest.config.ts`/projects, or run per-package in `pnpm test`. Integration tests named `*.integration.test.ts`, excluded in the default `include` and enabled only by `vitest.integration.config.ts`.

### Pitfall 9: Turbo `test` dependsOn build
Root `turbo.json` has `test: dependsOn build`, i.e. `pnpm test` triggers full Expo export. Keep new `test:integration` outside turbo's `test` task.

## Code Examples

### drizzle-orm netlify-db usage (Netlify docs)
```ts
import { drizzle } from 'drizzle-orm/netlify-db';
import * as schema from './schema';
export const db = drizzle({ schema });      // NETLIFY_DB_URL read at call time
```
Integration tests: set `NETLIFY_DB_DRIVER=server` and `NETLIFY_DB_URL=<database-dev connection string>` so the adapter uses node-postgres rather than the Neon HTTP/WebSocket driver (the local PG is not Neon). [VERIFIED: tarball driver.js]. If Drizzle is rejected, pass `pool` from `getDatabase().pool` and manual `BEGIN/COMMIT`.

### Transaction idempotency (conceptual)
```ts
await db.transaction(async (tx) => {
  const ins = await tx.insert(games).values(row).onConflictDoNothing({ target: games.id }).returning({ id: games.id });
  if (!ins.length) return { created: false };   // replay -> 200, skip seats/outcomes
  await tx.insert(gamePlayers).values(seats); await tx.insert(questionOutcomes).values(outs);
  return { created: true };
});
```
Replay must return a body identical to the 201 (echo `{ id, receivedAt }`; fetch stored `received_at` on replay).

### Integration test bootstrap (Netlify docs)
```ts
const ndb = new NetlifyDB(); const url = await ndb.start();
await ndb.applyMigrations('../../apps/mobile/netlify/database/migrations');
process.env.NETLIFY_DB_URL = url; process.env.NETLIFY_DB_DRIVER = 'server';
```

### netlify.toml additions (apps/mobile)
```toml
[build.environment]
  NODE_VERSION = "22"
[functions]
  node_bundler = "esbuild"
```
`directory` default `netlify/functions` already resolves under base dir; no setting needed. Root `netlify.toml` also bumps NODE_VERSION (generator site shares it).

### DDL sketch (text + CHECK)
```sql
CREATE TABLE games (id uuid PRIMARY KEY, install_id uuid NOT NULL, account_id uuid NULL,
  schema_version int NOT NULL, status text NOT NULL CHECK (status IN ('finished','abandoned')),
  started_at timestamptz NOT NULL, ended_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE game_players (game_id uuid REFERENCES games(id) ON DELETE CASCADE, seat smallint, ..., PRIMARY KEY (game_id, seat));
CREATE TABLE question_outcomes (game_id uuid REFERENCES games(id) ON DELETE CASCADE, seq int, pack_id uuid NOT NULL,
  question_id text NOT NULL, content_hash text NOT NULL, ..., PRIMARY KEY (game_id, seq));
CREATE INDEX ON question_outcomes (pack_id, question_id, content_hash);
CREATE TABLE feedback (id uuid PRIMARY KEY, game_id uuid NULL /* soft ref */, install_id uuid NOT NULL, account_id uuid NULL,
  pack_id uuid NOT NULL, question_id text NOT NULL, content_hash text NOT NULL, reason text NOT NULL CHECK (...), note text CHECK (char_length(note)<=500), received_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE review_decisions (id uuid PRIMARY KEY, pack_id uuid, question_id text, content_hash text, decision text CHECK (...), created_at timestamptz DEFAULT now());
```
Content hash must be computed by the client from the same algorithm as `services/checksum.ts` (Phase 26); server validates format only (hex/length).

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Netlify Functions v1 `handler(event)` | v2 `export default (req: Request)` + `config.path` | Use v2 only |
| Redirect-to-`/.netlify/functions/x` | `config.path` in code | No `_redirects` needed |
| drizzle 0.45 `latest` | `1.0.0-rc.5` (`rc` tag) has `netlify-db` adapter; Netlify docs still say `@beta` (1.0.0-beta.22) | Pin rc.5 exactly; note `revert-netlify` dist-tag on beta.23 (adapter was once reverted) -> spike mandatory |
| Node 20 | Netlify Database packages need >=22.12 | NODE_VERSION=22 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Migrations dir resolves relative to base dir (`apps/mobile/netlify/database/migrations`) | Pitfall 1 | Migrations not applied; spike catches |
| A2 | Non-PR branch deploys get no access to the prod DB | Pitfall 3 | Branch deploy writes could hit prod; spike must test |
| A3 | One function with multiple `path` entries = one rate-limit rule | Pitfall 5 | Rule budget blown; split/adjust |
| A4 | `packages/api` exporting TS source is bundled by esbuild and read by vitest | Patterns | Need a build step for api |
| A5 | drizzle-kit rc.5 migration dir (with snapshot.json) is accepted by Netlify | Pitfall 2 | Strip extras or hand-write SQL (fallback) |
| A6 | Netlify Database GA/beta status unknown; docs say credit-based plans only; user's account must be on a credit-based plan (free plan includes it with 48 CU) | Standard Stack | Provisioning may fail; confirm in spike |
| A7 | Zod 4 helper names (`z.strictObject`, `z.uuid`, `z.iso.datetime`) as in v4 docs | Contracts | Trivial test-driven fix |
| A8 | slopcheck not run; package postinstall scripts not inspected | Audit | Low; docs-cited |
| A9 | Self-fetching `/statusz.json` from inside the statusz function works (no function claims it) | Pitfall 4 | Use included_files instead |

## Open Questions (RESOLVED by plans 25-01/25-02 spike)

1. **Do functions in `apps/mobile/netlify/functions` see `NETLIFY_DB_URL` on previews pointing at the branch DB?** Spike: log connection host (not credentials) via `/api/v2/health` debug in preview vs prod; compare with `netlify database status --branch`. **RESOLVED BY:** 25-01 Task 4 (spikeHealth returns `dbHostFingerprint`) + 25-02 Task 3 step 1 (preview vs production branch comparison, production query); recorded as `PREVIEW_DB_ISOLATION`; re-proven after production exists in 25-09 Task 2 step 5.
2. **Is the netlify-db adapter's WebSocket/HTTP path OK for multi-statement transactions in a function?** Spike: run the three-table transaction on a preview and a forced-failure rollback. **RESOLVED BY:** 25-01 Task 4 (spike-probe commit/rollback modes) + 25-02 Task 2 step 5; recorded as `DRIZZLE` / `DB_TRANSACTION_OK`; enforced locally by the 25-05 Task 2 rollback integration test.
3. **What does `netlify link` target?** The repo is unlinked and the root `netlify.toml` is shared by two sites; the user must pick/create the game site and confirm base dir `apps/mobile` is set in UI (outward-facing). **RESOLVED BY:** 25-01 Task 1 (read-only site listing with base/package_path/functions_dir) + 25-01 Task 2 (user selects site id; blocking-human) + 25-01 Task 3 (`netlify link --id`); recorded as `SITE_ID` / `SITE_BASE_DIR` / `FUNCTIONS_DIR_EFFECTIVE` in 25-02 Task 2.
4. **Netlify Database on the user's plan** (credit-based, compute 48 CU/mo, sleeps after 5 min idle => first request after idle has cold-start latency; `/statusz` `down` probe needs a timeout of ~3-5 s). **RESOLVED BY:** 25-01 Task 1 (account plan check) + 25-01 Task 2 (user confirms credit-based plan or stop-plan); cold-start latency handled by the 3 s probe timeout in 25-04 Task 2 (health) and 25-07 Task 1 (statusz).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build, tests | yes | 25.9.0 local (Netlify: set 22) | — |
| pnpm | workspace | assumed (packageManager pnpm@9.0.0) | — | — |
| netlify-cli | link/db/deploy | yes | 26.1.0 (logged in, repo unlinked) | — |
| Netlify site link + database | spike | no (not linked) | — | none: blocks integration proof; unit work proceeds |
| `@netlify/database-dev` Postgres | integration tests | after install | 1.0.2, needs Node >=22.12 | local 25.9 OK |

Local Node is 25.9; `.nvmrc` absent — consider adding `.nvmrc` = 22 so local matches deploy (optional).

## Validation Architecture

(`workflow.nyquist_validation` is false in `.planning/config.json`; section retained at the user's explicit request.)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3 (apps/mobile); add vitest to `packages/api` and `packages/types` (match ^3) |
| Config | `apps/mobile/vitest.config.ts` (jsdom); `packages/api/vitest.config.ts` (environment node, excludes `*.integration.test.ts`); `packages/api/vitest.integration.config.ts` |
| Quick run | `npx vitest run packages/api packages/types` (or `pnpm --filter @trivial-world/api test`) |
| Full suite | `npx vitest run` (apps/mobile) + `pnpm --filter @trivial-world/api test` + `pnpm --filter @trivial-world/types test`; planner to add a root vitest `projects` config so a single `npx vitest run` from the root covers all three hermetically |
| Integration | `pnpm test:integration` (root script -> `pnpm --filter @trivial-world/api test:integration`; needs `@netlify/database-dev`, not in default gate) |
| Typecheck | `npx tsc --noEmit` per CLAUDE.md |

### Phase Requirements -> Test Map
| Req | Behavior | Type | Command | Exists |
|-----|----------|------|---------|--------|
| BACK-02 | Schemas accept valid, reject unknown fields/oversize arrays/long note/bad UUID | unit | `vitest run packages/types` | Wave 0 |
| BACK-04 | 201/200 replay/400/413 with fake repo; body-cap helper (Content-Length + stream) | unit | `vitest run packages/api` | Wave 0 |
| BACK-04 | 429 burst | manual/curl on preview (spike script) | `scripts/smoke-api.sh <preview-url>` | Wave 0 |
| BACK-03 | Migrations apply to empty PG; CHECK constraints; txn rollback; replay | integration | `pnpm test:integration` | Wave 0 |
| BACK-01 | `/api/v2/health` 200, `/api/v1/packs.json` 200 JSON, SPA deep link 200 HTML on preview | smoke curl | `scripts/smoke-api.sh` | Wave 0 |
| BACK-05 | statusz merges DB ok/down (fake repo `ping` ok / throws) | unit | `vitest run packages/api` | Wave 0 |
| BACK-06 | check-secrets fails on seeded dist with secret name/value, passes clean | unit (node script on temp dir) | `vitest run apps/mobile/scripts` or `node --test` | Wave 0 |
| BACK-07 | Default gate has no DB: tests never import `drizzle-orm/netlify-db`/`@netlify/database` at module scope; set `NETLIFY_DB_URL` unset in test setup and assert | unit | `npx vitest run` | Wave 0 |

### Sampling Rate
- Per task commit: `npx vitest run packages/api packages/types`
- Per wave merge: full `npx vitest run` + `npx tsc --noEmit` (per user CLAUDE.md; never leave known failures)
- Phase gate: full suite green, `pnpm test:integration` green locally, preview smoke script passes, secret scan passes in a Netlify build.

### Wave 0 Gaps
- [ ] `packages/api` scaffold + vitest configs; `packages/types` vitest dep + `*.test.ts`
- [ ] in-memory repo fake, `scripts/smoke-api.sh`, `check-secrets.test`
- [ ] Root test script covering packages (decision needed by planner)

## Security Domain

| ASVS | Applies | Control |
|------|---------|---------|
| V5 Input Validation | yes | Zod strictObject, body cap, array/string caps |
| V4 Access Control | scaffold | token compare helper (timingSafeEqual); admin routes deferred |
| V6 Cryptography | scaffold | `crypto.timingSafeEqual`, no custom crypto |
| V2/V3 Auth, Sessions | no | anonymous ingest |
| V13 API | yes | rate limit, method restrictions, JSON content-type check |

| Threat | STRIDE | Mitigation |
|--------|--------|------------|
| Junk/spam writes | Tampering/DoS | Rate rule, caps, strict schema, idempotent IDs |
| SQL injection | Tampering | Parameterized (Drizzle/pg) only |
| Secret leak to client | Info disclosure | `check-secrets.mjs`; no `EXPO_PUBLIC_` secrets |
| Verbose errors | Info disclosure | 400 returns concise Zod issue paths/messages only, 500 generic |
| Preview data exposure | Info disclosure | No PII stored; previews public |
| Replay/duplicate | Repudiation | UUID PK + ON CONFLICT |

## Recommended Plan Breakdown (waves)

Wave 1 — `25-01` Spike (`autonomous: false`; checkpoints before each outward step)
- Tasks: (1) CHECKPOINT: confirm which Netlify site to link; `netlify link` in repo; confirm UI base dir `apps/mobile`. (2) bump NODE_VERSION 22 (both tomls). (3) `pnpm add` api package skeleton + `@netlify/database`; trivial migration + `health.mts`; `netlify database migrations apply` locally with `netlify dev`. (4) CHECKPOINT: push a spike branch / open PR to get a deploy preview (git push + deploy are outward-facing); confirm DB provisioning. (5) Verify on preview: `/api/v2/health` via curl, `/api/v1/packs.json`, SPA deep link, `/statusz.json`; migration applied to preview branch (`netlify database status --branch`); write from preview and confirm prod DB (`netlify database connect --branch production`?) has no row; also test a non-PR branch deploy; rate-limit burst; drizzle `netlify-db` transaction. (6) Record go/no-go for Drizzle vs Kysely, migrations path, self-fetch vs included_files in `25-01-SUMMARY`. NOTE: the first production deploy provisions the production DB — merging to main is a separate user-confirmed step.

Wave 2 — `25-02` Contracts in `packages/types` (+ vitest config, tests). Parallel with `25-03` schema/migrations (generate via drizzle-kit or hand SQL per spike; CHECK constraints). Both autonomous.

Wave 3 — `25-04` `packages/api` handlers: http helpers (body cap, JSON responses, error mapping), repository interface + memory fake + DB repo (lazy), ingest/health handlers + unit tests; entrypoints in `apps/mobile/netlify/functions/` with `config` (rateLimit rule 1). `25-05` integration tests (`test:integration`, database-dev) — autonomous.

Wave 4 — `25-06` `/statusz` function + `_redirects`/`_headers` edits + `check-secrets.mjs` + build script wiring + test; token-compare scaffold. `25-07` smoke script + `.claude/skills/tw-backend-setup/SKILL.md` + root `test:integration` script + docs/STATE notes.

Wave 5 — `25-08` (`autonomous: false`) final verification: user-confirmed push to a preview, run smoke script, confirm 429/413/400, confirm prod untouched, then (confirmed) merge/production deploy and `/statusz` check. Full-suite + tsc gate before commit (user CLAUDE.md).

Steps requiring user confirmation (`checkpoint:human-verify` / autonomous:false): `netlify link`/site selection, enabling DB (first deploy provisions), `netlify env:set` (none needed this phase beyond possible placeholder; do NOT set secrets unless user approves), any `git push`/PR/deploy, merging to production, any writes against production DB. Commits use author Faiser / keepbreakfastsimple@gmail.com.

## Project Constraints (from CLAUDE.md)
- Commit author Faiser <keepbreakfastsimple@gmail.com>; run full vitest + `npx tsc --noEmit` before significant commits; no known-broken tests; pre-push full suite.
- Multi-step deployment workflows become a repo skill (`tw-backend-setup`), like existing `tw-add-pack`.
- Pack IDs must be RFC-4122 UUIDs (validated by `services/packAssets.test.ts`) — contracts use `z.uuid()`.
- Offline-first, no accounts, same-origin; do not break `/api/v1/packs.json` or SW. (Doc drift: CLAUDE.md says Expo SDK 55; `apps/mobile/package.json` has `expo ~56.0.9`.)
- Python style N/A.

## Sources

### Primary (HIGH)
- https://docs.netlify.com/build/data-and-storage/netlify-database/{getting-started,migrations,tooling,local-development,api,cli,billing-and-usage}/ and `/netlify-database/` (fetched 2026-11-17)
- https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
- https://docs.netlify.com/build/functions/{get-started,configuration}/ and https://docs.netlify.com/resources/troubleshooting/request-chain/
- npm registry (`npm view`, `npm pack drizzle-orm@1.0.0-rc.5` tarball inspected: `netlify-db/driver.js`, exports `./*`)
- Repo files: `apps/mobile/{netlify.toml,package.json,vitest.config.ts,public/_redirects,public/_headers,scripts/generate-statusz.mjs}`, root `netlify.toml`, `turbo.json`, `pnpm-workspace.yaml`, `packages/types/*`

### Secondary (MEDIUM)
- `.planning/research/{STACK,PITFALLS}.md` (2026-11-14, partially re-verified here)

### Tertiary (LOW)
- Zod 4 helper names from training knowledge (A7); esbuild workspace bundling behavior (A4)

## Metadata
**Confidence:** Stack HIGH (registry + docs); Architecture MEDIUM (base-dir/migrations path unproven); Pitfalls MEDIUM.
**Research date:** 2026-11-17 — **Valid until:** ~2026-12-01 (Netlify Database and Drizzle rc move quickly).
