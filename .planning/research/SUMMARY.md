# Project Research Summary

**Project:** Trivial World — Milestone v13.0 (Game History & Question Feedback Backend)
**Domain:** Stateful backend (game recording, question feedback, admin review, LLM batch review) added to an offline-first, no-accounts trivia PWA
**Researched:** 2026-11-14
**Confidence:** MEDIUM (repo-integration facts HIGH; vendor limits, Drizzle rc adapter, Netlify monorepo behavior need spikes)

## Executive Summary

v13.0 adds the first server to a static, offline-first Netlify PWA: record finished games and per-question outcomes, collect conductor flags on bad questions, and give the maintainer a review queue (admin page + LLM batch API). The backend is operator-facing, not player-facing — players never log in, player names never leave the device, and gameplay must never wait on the network.

All four researchers converged on one shape: **Netlify Functions v2 + Netlify Database (Postgres)** on the existing game site, same-origin at `/api/v2/*` (no new vendor); **Drizzle** (raw-SQL fallback); shared **Zod contracts in `packages/types`**; **anonymous per-install UUID** as the only identity; **`(packId, questionId, contentHash)`** question identity (question ids are only pack-unique); an **IndexedDB outbox** with client-generated UUIDs + `ON CONFLICT DO NOTHING`; an **undo-safe outcome draft log** in `gameStore` finalized once; **LLM output as proposals** requiring human approval; packs in git remain source of truth — the DB is a review queue and a CLI applies approved edits.

Key risks: (1) undo-corrupted outcomes, (2) duplicate/lost uploads, (3) unstable question identity, (4) anonymous endpoint abuse + `EXPO_PUBLIC_*` secret leakage, (5) LLM/prompt-injected edits reaching packs, (6) the Service Worker / SPA catch-all swallowing API routes, (7) breaking offline gameplay or the 433 tests. The largest unverified items are infrastructural (Netlify functions + migrations in this two-site monorepo, the `drizzle-orm/netlify-db` adapter in pinned `1.0.0-rc.5`, free-tier exhaustion behavior) — spike first in Phase 25.

## Key Findings

### Recommended Stack

Stay on Netlify, add no vendors. Supabase rejected (free-tier idle pausing, RLS-from-anon-key is a weaker control point than a validating function, Deno/Docker friction). Cloudflare Workers + D1 is the escape hatch — keep handlers as plain `(Request) => Response` behind a repository module so that move stays cheap.

**Core technologies:**
- **Netlify Functions v2** (`@netlify/functions` ^6.1.1) — API with in-file `config.path` + `config.rateLimit`; same origin as PWA
- **Netlify Database** (`@netlify/database` ^2.0.3) — managed Postgres, forward-only SQL migrations applied on deploy, per-deploy-preview DB branches
- **`@netlify/database-dev`** — real in-memory Postgres for vitest, no Docker
- **Drizzle ORM + drizzle-kit pinned `1.0.0-rc.5`** (MEDIUM) — schema-as-code emitting Netlify's migration format. Fallback: hand-written SQL migrations + raw SQL or Kysely 0.29.x. Do not mix in `drizzle-orm@0.45`
- **Zod ^4 in `packages/types`** — game-record / feedback / review schemas, `.strict()`, length/array caps, `schemaVersion`
- **idb-keyval (existing)** — outbox in its own IDB database (`trivial-world-outbox`); no new client libraries
- **`ADMIN_TOKEN` + `REVIEW_API_TOKEN`** — separate Netlify secrets, constant-time SHA-256 compare, independently rotatable

Free plan allows 2 code-based rate-limit rules: one for public ingest, one for admin/review.

**Do NOT add:** auth providers, a users table, JWT libs, CAPTCHA, workbox-background-sync, Hono, secrets in `EXPO_PUBLIC_*`.

### Expected Features

**Must have (table stakes):**
- Anonymous resettable device ID; no login; no player names (nullable `account_id` hook for later)
- Per-game summary + per-question outcomes, uploaded once at finalize under a client `gameId`
- Undo-correct outcome capture
- Offline outbox — fire-and-forget; flush on app start, `online`, `visibilitychange`, game end; backoff + dead-letter
- Flag button on answer-reveal screen only (never mid-read) → bottom sheet, single-tap reasons, optional note (~280–500 chars), confirmation toast, local already-flagged state, server dedupe
- Admin queue: status/reason/pack filters, per-question aggregates (flag count, reason breakdown, % correct, times asked), resolve/dismiss with audit note
- LLM export grouped per question + idempotent decision-apply with `content_hash` stale check

**Should have:**
- Dry-run + per-item results (applied/skipped/stale/invalid) on apply
- Difficulty calibration: collect now, display later, hidden below ~20 samples
- Admin bulk actions
- `pnpm apply-reviews` CLI patching pack JSON + checksum/version/index

**Defer (v13+):** Google sign-in / cross-device history; retired-question list pushed into pack distribution; in-app history screen; stats dashboard beyond question stats; Background Sync; social features; leaderboards.

**Reconciled taxonomies:** feedback reasons `wrong_answer | ambiguous | outdated | typo | offensive | other` (note required for `other`; difficulty complaints inferred from outcome stats). Decision enum `keep | edit | retire | dismiss` (use `retire`, not `remove`).

### Architecture Approach

New workspace package **`apps/api`** (handlers, db client, migrations, auth guards) deployed via the game site's Netlify `[functions]` wiring (fallback: thin re-export `apps/mobile/netlify/functions/*`). Not Next route handlers in the generator (static export). Use `/api/v2/*` to avoid colliding with static `/api/v1/packs.json` and its header rules.

Client: a `gameRecorder` module called explicitly from `gameStore` at four sites (not subscribe-and-diff): `startGame` (open recording, `gameId`, `startedAt`, empty `outcomeLog`), `markAnswer` (append), `undoLastMark` (truncate to `snapshot.outcomeLogLength`), `resetGame` / results-exit (finalize). Finalize on results-screen exit (undo from the win screen can cancel) with boot-time recovery. `questionProvider` stamps a non-persisted `sourcePackId` on each question (combo pools make pack ambiguous). Client computes `content_hash` with existing `services/checksum.ts`.

**Major components:**
1. **`packages/types` contracts** — `game-record`, `feedback`, `review`, discriminated-union outbox item
2. **`apps/api` + Postgres** — `games`, `game_players`, `question_outcomes`, `feedback`, `review_decisions`, stats view; game + outcomes in ONE request / ONE transaction; `feedback.game_id` soft reference (no FK); `text + CHECK` enums
3. **`outbox.ts` + `gameRecorder.ts`** — IDB queue, `navigator.locks` single-flight, jittered backoff, 4xx (≠408/429) → dead-letter, 5xx/network retry, capped queue, `requestPersistentStorage()`; SW `NetworkOnly` for `/api/v2/*`
4. **Feedback sheet** — `QuestionCard` `onFlag` prop + `app/game/question.tsx`; no game-state change
5. **Admin UI + `/api/v2/admin/*`** — `Cache-Control: no-store`
6. **`/api/v2/review/export` + `/review/apply` + `pnpm apply-reviews` CLI** — functions never mutate pack files

### Critical Pitfalls

1. **Undo corrupts outcomes** — never write to outbox per mark; draft log in store, truncated atomically on undo, finalized once. Test mark→mark→undo→mark and undo-from-win.
2. **Duplicate/lost uploads, retry storms** — client UUIDs, `ON CONFLICT DO NOTHING`, one transaction per game, `UNIQUE(game_id, seq)`, delete from outbox only after 2xx, backoff + lock. No reliance on Background Sync (absent on iOS Safari).
3. **Unstable question identity** — key `(packId, questionId, contentHash)`; snapshot question/answer text into feedback rows; pack-lint test for unique ids; substantive edit = new id + tombstone.
4. **Anonymous abuse & secret leakage** — `.strict()` Zod, 64 KB body cap, array/string caps, known-packs check, Netlify rate limiting; no `EXPO_PUBLIC_*` secrets; CI grep of `dist/`; env scoping per deploy context so previews never hit prod DB.
5. **LLM / prompt-injected pack writes** — notes are untrusted data (delimited, truncated, labeled JSON field). Delimiting alone is insufficient; real defenses are a closed decision enum, decisions limited to exported items, batch change caps, LLM `edit`/`retire` landing as `proposed` for human approval, and git diff review.
6. **SW / SPA catch-all swallowing API** — `NetworkOnly` route + `NavigationRoute` denylist for `/api/`, correct redirect ordering, never cache/precache admin data; post-build check of `dist/sw.js`.
7. **Breaking offline gameplay / 433 tests** — recording is a try/catch-wrapped, fire-and-forget, additive-only side effect; no-op without backend config; integration tests excluded from default `npx vitest run` gate.

## Implications for Roadmap

Five coarse phases continuing from Phase 24. Order: server + contracts first (both clients target them), outbox before its two producers, human review before the LLM path.

### Phase 25: Contracts, Backend Skeleton & Database
**Rationale:** Everything targets these contracts; schema decisions (identity, no names, idempotency, status model, `schemaVersion`) are expensive to retrofit.
**Delivers:** Zod schemas in `packages/types`; `apps/api` workspace + Netlify `[functions]` wiring; Drizzle schema + first migration; `POST /api/v2/games` and `/api/v2/feedback` (public, idempotent, strict validation, size caps, rate-limit rule); token middleware; health endpoint extending `/statusz`; CI `dist/` secret scan; per-context env scoping; handler tests on `@netlify/database-dev`. Curl-able API on a deploy preview.
**Avoids:** pitfalls 4, 5, 6, 9, 10, 13, 17.

### Phase 26: Client Outbox & Game Recording
**Rationale:** One coherent client slice; the recorder is the heaviest test surface; both depend only on the Phase 25 contract (server can be mocked). Outbox first within the phase.
**Delivers:** outbox (own IDB DB, flush triggers, jittered backoff, dead-letter, cap, lock) + install `clientId`; SW `NetworkOnly` + `NavigationRoute` denylist for `/api/v2/*`; `gameStore` changes (`gameId`, `startedAt`, `outcomeLog`, `outcomeLogLength` in `MarkSnapshot`); `sourcePackId` stamping; finalize on results exit, abandoned handling, boot recovery; fake-indexeddb tests; offline Playwright game asserting one outbox record.
**Avoids:** pitfalls 1, 2, 3, 12, 14. May split at the outbox/recorder seam.

### Phase 27: Question Feedback
**Rationale:** Small, reuses outbox + `sourcePackId`; shipping before admin starts real flags flowing.
**Delivers:** reveal-screen flag icon → bottom-sheet reason picker, optional note, toast, local flagged state; server dedupe on `(client_id, pack_id, question_id, reason)`; text + hash snapshot in payload.
**Avoids:** pitfalls 14 (eyes-up clutter), 18 (duplicate floods).

### Phase 28: Admin Review Page
**Rationale:** The human approval surface must exist before any LLM write path.
**Delivers:** token-gated `/api/v2/admin/*`: queue grouped by `(pack, question, content_hash)`, filters, per-question stats, resolve/dismiss with audit note, bulk dismiss; admin UI (see Open Decision 1); unauthenticated-request tests for every admin route; `no-store`; escaped note rendering.
**Avoids:** pitfall 7, stale cached admin data, XSS via notes.

### Phase 29: LLM Review API & Pack Round-Trip
**Rationale:** Highest risk; goes last with human approval already in place.
**Delivers:** `GET /api/v2/review/export` (grouped, delimited untrusted notes, `stale` flag, stats); `POST /api/v2/review/apply` (idempotent `batchId`, dry-run, content-hash check, change cap, LLM `edit`/`retire` → `proposed`); admin approve/reject; `pnpm apply-reviews` (validate with `QuestionSchema`, 20-question pack minimum, recompute counts/checksum, bump version, update pack index, human commit); scoped `REVIEW_API_TOKEN`.
**Avoids:** pitfalls 8, 4 (ID drift on edits).

**Ordering notes:** Phase 26 merges ARCHITECTURE's phases 2+3 for coarse granularity. Hardening (Background Sync, retention/cleanup, privacy notice) → optional final plan in Phase 29 or a follow-up milestone.

### Open Decisions (researchers disagreed; recommendation given)

1. **Admin page location.** Generator app (STACK): already maintainer-only, no player bundle cost — but a different origin requires a CORS allowlist + OPTIONS handling, and it's static-only. Mobile `/admin` Expo Router route (ARCHITECTURE): same origin, no CORS, one deploy, shared types — but admin code ships in the player bundle and may be precached. **Recommendation:** same-origin mobile route, lazily loaded where Expo Router allows, excluded from precache, `noindex`; security is server-side token checks. Fallback: plain static page under `public/admin/`. Verify Expo Router route splitting in Phase 28 (LOW).
2. **Admin authentication.** Static `ADMIN_TOKEN` bearer in sessionStorage (STACK) vs token→HttpOnly cookie (ARCHITECTURE) vs managed Google login with one allow-listed email (PITFALLS / Google-auth todo). **Recommendation:** static `ADMIN_TOKEN` as `Authorization` bearer held in sessionStorage, constant-time compare, rate limit, `no-store` (bearer-only → no CSRF, no accounts machinery). Never in the bundle; separate LLM key. Move to Google login only if a second admin appears. Players stay anonymous; Google-auth todo stays deferred.
3. **Abandoned-game recording.** ARCHITECTURE: finalize on `resetGame` only with ≥3 outcomes, else drop (draft in sessionStorage). PITFALLS: mirror in-progress games to IDB per mark, promote stale ones to `abandoned` at boot (sessionStorage dies with the tab — the common way sessions end). **Recommendation:** upload only games with ≥3 outcomes; `gameStore` remains source of truth but mirrors the truncated log (after each mark/undo) to the outbox IDB DB; records older than ~6h promoted to `abandoned` at boot with `endedAt` = last activity; never send "start" rows; `status: finished | abandoned`. The mirror does not make games resumable (does not reverse WEBG-02).

### Research Flags

Needs research (`--research-phase`):
- **Phase 25:** Netlify functions/migrations directory behavior with the shared root `netlify.toml` (LOW); `drizzle-orm/netlify-db` in pinned rc; Node version required by `@netlify/database`; credit-exhaustion behavior; rate-limit layout. Run the deploy-preview spike first.
- **Phase 26:** iOS Safari IDB eviction; `navigator.locks` fallback; exact finalize-vs-undo lifecycle.
- **Phase 28:** Expo Router async route splitting; SW precache exclusion.
- **Phase 29:** prompt-injection hygiene for export format; pack-patch semantics (checksum, version, index regen, immutable-cache propagation).

Standard patterns (skip research): **Phase 27**.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Netlify Database docs fetched (HIGH); Drizzle rc adapter, free-tier exhaustion, monorepo migration handling unverified |
| Features | MEDIUM | Training knowledge of comparable products; no live verification |
| Architecture | MEDIUM-HIGH | Integration points read from code (HIGH); hosting specifics and Expo route splitting unverified |
| Pitfalls | MEDIUM | Repo facts HIGH; rest is established practice, some vendor numbers LOW–MEDIUM |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Netlify monorepo wiring** — functions + migrations paths for the game site only; resolve via deploy-preview spike in Phase 25
- **Drizzle rc adapter** — confirm or use SQL/Kysely fallback
- **Free-tier behavior** — credit exhaustion may pause the site; DB sleeps after 5 min idle; monitor meter, keep repository seam
- **Path namespace** — use `/api/v2/*` everywhere (STACK.md still says `/api/v1/*` in places, which collides with the static pack index)
- **Question id stability policy** — check how generator/review pipeline treats ids on regeneration
- **Privacy** — define the install ID; "clear history" reset regenerates it; no stored IPs; confirm before launch (not legal advice)
- **Outbox cap size and raw-outcome retention policy**
- **Alerting on ingest failure** — client fails silently by design
- **Node 20 EOL** — check `NODE_VERSION`

## Sources

### Primary (HIGH)
- Netlify Database docs and rate-limiting docs (fetched for STACK.md)
- npm registry versions queried 2026-11-14
- Repo: `gameStore.ts`, `questionProvider.ts`, `packCache.web.ts`, `platformStorage.ts`, `sw-template.js`, `_redirects`, `_headers`, `question-pack.ts`, both `netlify.toml` files

### Secondary (MEDIUM)
- Competitor free-tier / pause-policy comparisons
- Idempotent outbox pattern, Workbox denylist, Netlify redirect ordering, Background Sync support

### Tertiary (LOW)
- Jackbox / Kahoot / Heads Up / Trivia Crack UX patterns
- GDPR / COPPA guidance
- Expo Router route splitting

---
*Research completed: 2026-11-14*
*Ready for roadmap: yes*
