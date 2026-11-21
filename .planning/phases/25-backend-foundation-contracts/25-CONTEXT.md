# Phase 25: Backend Foundation & Contracts - Context

**Gathered:** 2026-11-17
**Status:** Ready for planning

<domain>
## Phase Boundary

A secure, migrated, same-origin backend exists under `/api/v2/*` on the game site (Netlify Functions + Netlify Database/Postgres) that validates and stores game-record and feedback payloads idempotently, without disturbing the static site (`/api/v1/packs.json`, SPA deep links, `/statusz`). Shared Zod contracts live in `packages/types`. The default `npx vitest run` gate stays hermetic. Covers BACK-01..07. Client outbox/recording (Phase 26), feedback UI (27), auth (28), admin (29), and review API (30) are out of scope — but the DB schema created here must already accommodate them (games, game_players, question_outcomes, feedback, review_decisions; nullable `account_id`; `status finished|abandoned`; `(pack_id, question_id, content_hash)` identity).

</domain>

<decisions>
## Implementation Decisions

### Infrastructure & Deployment
- Backend logic (handlers, validation glue, repository, DB client) lives in a NEW workspace package `packages/api`; thin Netlify Functions v2 entrypoints in `apps/mobile/netlify/functions/` (game site base dir is `apps/mobile`, which has its own `netlify.toml`) import from it. No separate Netlify site, no CORS for the game.
- DB access: Drizzle ORM + drizzle-kit pinned `1.0.0-rc.5` IF the first plan's spike confirms the `drizzle-orm/netlify-db` adapter exists and works; otherwise hand-written SQL migrations in Netlify's migrations folder + Kysely. Do not mix in drizzle-orm 0.45.
- Netlify setup (link the game site, install/provision `@netlify/database`, set env secrets) is executed by Claude via Netlify CLI, confirming with the user before each outward-facing step (link, provisioning, env:set, deploy/push). Capture the steps as an executable project skill `.claude/skills/tw-backend-setup/SKILL.md` (user CLAUDE.md rule for multi-step deployment workflows).
- Bump `NODE_VERSION` 20 → 22 in `apps/mobile/netlify.toml` (and root `netlify.toml`) — Node 20 EOL.

### API Contract & Abuse Protection
- Endpoints this phase: `POST /api/v2/games`, `POST /api/v2/feedback`, `GET /api/v2/health`.
- Responses: `201` on new record; `200` with identical body on replay of an existing client ID (idempotent, `ON CONFLICT DO NOTHING`); `400` with concise Zod issue summary; `413` oversized; `429` rate limited.
- Rate limiting: one Netlify code-based rule per IP, 60 req/min, across public ingest. Reserve the second free-plan rule for admin/review (Phases 29–30).
- Caps: body ≤ 64 KB, ≤ 500 outcomes per game, note ≤ 500 chars, `.strict()` schemas reject unknown fields.
- `installId` is a UUID field in the request body (not a header). Pack IDs validated as UUID format only — no known-packs check at write time.
- A game record (game + seats + outcomes) is ONE request and ONE transaction. `feedback.game_id` is a soft reference (no FK). Enums as `text + CHECK`. Server sets `received_at`. Player names never accepted (seat indexes only; strict schema guarantees no name field).
- Contracts include `schemaVersion`; server accepts current version.

### Testing, CI Gates & Status
- Handlers take an injected repository interface. Unit tests use an in-memory fake repo → default `npx vitest run` needs no DB. Real-Postgres integration tests run via separate `pnpm test:integration` using `@netlify/database-dev`; excluded from the default gate. DB clients created lazily, never at import time.
- Secret scan: `apps/mobile/scripts/check-secrets.mjs` appended to the end of `pnpm build` / `build:web`; fails if `dist/` contains server secret names or (when present in env) values: `DATABASE_URL`, `NETLIFY_DB_*`, `ADMIN_TOKEN`, `REVIEW_API_TOKEN`. Netlify build is the CI gate (no GitHub Actions).
- `/statusz` becomes a Netlify Function that merges build-time `statusz.json` with a live DB check (`ok|down` + latency). `/statusz.json` stays static. Update `_redirects` (currently `/statusz → /statusz.json`) accordingly; ensure `/api/v2/*` is not swallowed by the SPA catch-all (`/* /index.html 200`) and that functions take precedence.
- Deploy-preview isolation: rely on Netlify Database per-deploy-preview branches; verify during the spike by writing from a preview and confirming production is untouched. If isolation can't be proven, previews get no DB access.

### Claude's Discretion
- Exact table/column naming, index choices, Zod schema file layout in `packages/types`, migration file naming, health payload shape.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/types/src/question-pack.ts` — Zod QuestionSchema v3 / pack metadata (pack ids are RFC-4122 UUIDs; question ids are pack-scoped slugs `^[a-z0-9-]+$`)
- `apps/mobile/scripts/generate-statusz.mjs` — builds static statusz.json (build timestamp, packs, question counts)
- `apps/mobile/services/checksum.ts` — existing hashing util (content hash for question identity)

### Established Patterns
- Zod-first schemas in `packages/types`, TS types derived via `z.infer`
- vitest across workspaces; `__mocks__/` in apps/mobile
- Build pipeline: `expo export` → copy public assets → `generate-statusz.mjs` → `build-sw.mjs`

### Integration Points
- `apps/mobile/netlify.toml` (game site config, base dir apps/mobile, publish `dist`) — add `[functions]` / Node 22
- `apps/mobile/public/_redirects` — `/statusz` alias and SPA catch-all `/* /index.html 200`
- `apps/mobile/public/sw-template.js` — NavigationRoute + SWR for `/api/v1/packs.json` (SW changes for `/api/v2` belong to Phase 26 per SYNC-05, but don't break it here)
- Root `netlify.toml` is shared by both sites (game + generator); prefer changing `apps/mobile/netlify.toml`
- Netlify CLI installed and logged in; repo NOT linked to a site yet

</code_context>

<specifics>
## Specific Ideas

- Run the deploy-preview spike first (Netlify functions dir resolution, migrations applied, Drizzle rc adapter, per-preview DB branch, Node 22).
- Research reference: `.planning/research/SUMMARY.md`, `STACK.md`, `PITFALLS.md`.

</specifics>

<deferred>
## Deferred Ideas

- SW `NetworkOnly` for `/api/v2/*` → Phase 26 (SYNC-05)
- Admin/review auth middleware usage → Phases 29–30 (token compare helper may be scaffolded here)
- GitHub Actions CI → not planned

</deferred>
