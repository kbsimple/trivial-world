# Architecture Patterns: v13.0 Game History & Question Feedback Backend

**Domain:** Stateful backend bolted onto an offline-first static PWA trivia game
**Researched:** 2026-11-14
**Overall confidence:** MEDIUM-HIGH (integration points read from code = HIGH; hosting specifics = MEDIUM, not re-verified against vendor docs this session)

## Findings From the Code (integration facts)

| Fact | Source | Consequence |
|------|--------|-------------|
| Question `id` is a pack-scoped URL-safe slug (`^[a-z0-9-]+$`), NOT globally unique; pack id is UUID | `packages/types/src/question-pack.ts` | Stable identity = `(packId, questionId)`. Never key on question id alone. `questionStore.askedQuestionIds` is id-only (existing latent collision risk; do not copy it). |
| Pack version/checksum live in pack metadata; question text can change between versions with the same id | same | Snapshot `questionText`/`answerText` hash with each feedback item and each outcome, so the reviewer sees what the conductor saw. |
| `gameStore.markAnswer(correct)` is the single place an outcome is decided; it sets `lastMarkSnapshot`, and `undoLastMark()` restores it. `selectCategory` clears the snapshot. `skipQuestion` calls `markAsked` but is NOT an outcome | `stores/gameStore.ts` | Record outcomes in an in-memory/persisted *draft log* and finalize only on game end. Undo pops the last draft entry. Never write to the outbox per-mark. |
| Win is detected inside `markAnswer` (`phase: 'finished'`, `winner`); `resetGame()` returns to setup; `startGame()` resets state | same | Natural hooks: `startGame` success = open recording; `phase -> finished` = finalize; `resetGame` while in-progress = finalize as `abandoned` (or drop). |
| gameStore persists to **sessionStorage** (`platformStorage`), not IDB; IDB is only used for packs via `idb-keyval` `createStore('trivial-world-packs','pack-cache')` | `services/platformStorage.ts`, `packCache.web.ts` | Outbox must be a NEW IDB store (separate DB name, e.g. `trivial-world-outbox`), not sessionStorage (lost on tab close) and not the pack store (cache eviction code `deleteCachedPack`/`getOfflinePackIds` enumerates keys there). |
| Service Worker is Workbox `injectManifest` (`public/sw-template.js` -> `scripts/build-sw.mjs`): precache + NavigationRoute to `/index.html` + SWR for `/api/v1/packs.json` | `public/sw-template.js` | The NavigationRoute denylist must exclude `/admin` is NOT needed if admin is elsewhere; API paths are non-navigation fetches so they pass through, but any new `/api/...` GET must not be accidentally cached. |
| `_redirects` ends with `/* /index.html 200`; `/api/v1/packs.json` is a static file under the same origin; headers file sets `/api/v1/*.json` cache rules | `public/_redirects`, `_headers` | Function routes must not collide with `/api/v1/*.json`. Use `/api/v2/*` or `/api/h/*` (function `config.path`) which Netlify resolves before the SPA catch-all. |
| Two Netlify sites share one root `netlify.toml`; each app has its own `netlify.toml` with `publish`. Generator is `output: 'export'` (fully static, no Next runtime) | `netlify.toml`, `apps/*/netlify.toml` | Functions need a site to attach to. Generator is static-only and dev-only (Ollama) today; it cannot host protected server routes without adding Next runtime/plugin. |
| Packs are plain JSON under `apps/mobile/public/packs/*.json` + `public/api/v1/packs.json` index; `pnpm review` (generator `scripts/review.ts`) reviews *drafts* and publishes packs | repo layout | There is no CLI today that edits an existing published question. A new "apply decisions" CLI is needed. |
| `@trivial-world/types` is Zod-first, has `json-schema.ts` generation, imported by mobile and generator | `packages/types/src` | Add `game-record.ts`, `feedback.ts`, `review.ts` here; function code imports the same schemas. |

## Recommended Architecture

```
 PWA (apps/mobile)                                   Netlify (game site, same origin)
 ┌──────────────────────────────┐                    ┌─────────────────────────────────┐
 │ gameStore ──events──► recorder│                    │ netlify/functions (apps/api pkg)│
 │   (draft log, sessionStorage) │                    │  POST /api/v2/games     (public) │
 │ QuestionCard ─flag─► feedback │                    │  POST /api/v2/feedback  (public) │
 │        │                      │                    │  GET  /api/v2/admin/*   (authed) │
 │        ▼                      │   fetch (online)   │  GET  /api/v2/review/export(key) │
 │ outbox (IDB, own DB) ─────────┼───────────────────►│  POST /api/v2/review/apply(key)  │
 │   flush on: online event,     │   idempotent PUT   └──────────────┬──────────────────┘
 │   app start, visibility,      │                                   │ SQL
 │   (BG Sync = progressive)     │                            ┌──────▼───────┐
 └──────────────────────────────┘                            │  Postgres     │
 Admin UI: apps/admin?  (see below)                          └───────────────┘
 Pack JSON ◄── `pnpm apply-reviews` CLI (reads export/decisions, edits public/packs/*.json, bumps version/checksum)
```

### Component Boundaries

| Component | New/Modified | Responsibility | Talks to |
|-----------|--------------|----------------|----------|
| `packages/types/src/{game-record,feedback,review}.ts` | NEW | Zod contracts for outbox payloads, API request/response, review export/decisions | all |
| `apps/api` (workspace pkg, Netlify Functions source) | NEW | Handlers, DB access, auth guards, migrations | Postgres, types |
| `apps/mobile/services/outbox.ts` (+ `outbox.web.ts` not needed; web-only now) | NEW | IDB queue, flush, backoff, dedupe | `fetch`, SW |
| `apps/mobile/services/gameRecorder.ts` | NEW | Subscribes to gameStore, builds draft log, finalizes to outbox | gameStore, outbox |
| `apps/mobile/stores/gameStore.ts` | MODIFIED (small) | Emits lifecycle calls; adds `gameId` + `startedAt`; undo pops draft | recorder |
| `apps/mobile/components/QuestionCard.tsx` + feedback sheet | MODIFIED/NEW | Flag button, reason picker, optional note | outbox via `feedbackService` |
| `apps/mobile/public/sw-template.js` | MODIFIED | Optional Background Sync tag `tw-outbox`; ensure API routes are NetworkOnly | outbox |
| Admin UI | NEW | Review queue, resolve/dismiss | `/api/v2/admin/*` |
| `scripts/apply-reviews` (CLI in generator scripts or root) | NEW | Pull approved decisions, patch pack JSON | review API, pack files |
| `netlify.toml` (mobile) | MODIFIED | `[functions] directory`, env, API redirect/headers | - |

## Decision 1: Where backend code lives

**Recommendation: new workspace package `apps/api` containing handler source + migrations + db client; Netlify deploys it via the *game* site's `[functions] directory`.**

- Netlify resolves `functions.directory` relative to the base dir/`netlify.toml`. Put `[functions] directory = "../api/netlify/functions"` (or a small build step that bundles `apps/api/src/handlers/*` into `apps/mobile/netlify/functions/`) in `apps/mobile/netlify.toml`. Verify relative-path behavior with a deploy preview early (MEDIUM confidence; path-outside-base has historically been finicky). Safe fallback: keep a thin `apps/mobile/netlify/functions/*.ts` that re-exports from `@trivial-world/api` — esbuild bundles workspace deps.
- Same origin as the PWA = no CORS, no extra origin in SW scope, no preflight on POST. Strong reason to attach functions to the **game** site, not generator.
- Keep handlers as pure `(Request) => Response` functions (Netlify Functions v2 signature) with DB and auth injected, so they are unit-testable with vitest (project mandates tests pass) without Netlify.
- Do NOT put it in `packages/` (it is deployable, not a library) and do NOT add Next.js route handlers to generator (static export forbids them).

### Netlify Functions + Postgres vs Supabase

| Concern | Netlify Functions + Postgres (Netlify DB/Neon, or any Neon) | Supabase |
|---------|-------------------------------------------------------------|----------|
| Backend code | `apps/api` handlers; you own validation (Zod from `packages/types`) | Option A: PWA calls PostgREST/RPC directly with anon key + RLS. Option B: Edge Functions (Deno) |
| Idempotent upsert | `INSERT ... ON CONFLICT (id) DO NOTHING` in handler | Same via RPC or `upsert(..., {ignoreDuplicates:true})`; RLS must allow anon insert-only |
| Anonymous writes safety | Handler enforces schema, size limits, rate limit | Anon key is public; RLS + column constraints must carry all the weight; no server-side Zod unless Edge Function |
| Shared Zod contracts | Direct reuse in handler (Node) | Edge Functions are Deno; reuse needs npm: specifiers/bundling; direct-PostgREST path skips Zod server-side |
| Admin auth | Roll own (shared secret/cookie, or Netlify Identity/OAuth) | Supabase Auth (Google) built-in; RLS by role. Best fit *if* admin must be Google-login |
| LLM review API | Bearer token env var, simple handler | Service-role key in a script, or Edge Function with token |
| Local dev/test | Postgres in docker + vitest on handlers; `netlify dev` | Supabase CLI local stack (heavier) |
| Deploy coupling | Single deploy with the static site; env vars in Netlify | Two systems (Netlify static + Supabase project); migrations via CLI |
| Lock-in/cost | Low; plain SQL | Moderate; free tier pauses idle projects (relevant for a hobby game) |

**Opinion:** Netlify Functions + managed Postgres (Neon) for this repo: one deploy target, same-origin, Zod reuse, plain SQL migrations. Choose Supabase only if the milestone decides to ship Google login for admin and wants zero auth code. If Supabase, still prefer a thin Edge/Netlify function in front of writes rather than raw anon-key table access. Hosting vendor details (Netlify DB product naming, free-tier limits) are MEDIUM/LOW confidence: confirm in the stack file/vendor docs.

## Decision 2: Data Model (Postgres)

All client-originated primary keys are client-generated UUIDv4 (idempotency).

```sql
games (
  id uuid PK,                      -- client gameId
  client_id uuid NOT NULL,         -- anonymous install id (see identity)
  started_at timestamptz, ended_at timestamptz,
  status text CHECK (status IN ('finished','abandoned')),
  player_count int, winner_index int NULL,
  championship_reached boolean,
  pack_mode text, game_pack_id uuid NULL, combo_name text NULL,
  app_version text, received_at timestamptz DEFAULT now()
)
game_players (                      -- optional but cheap; needed for per-player pack/difficulty
  game_id uuid FK, seat int, PRIMARY KEY (game_id, seat),
  pack_ids uuid[], difficulty text NULL, categories_completed text[]
  -- NO player names (privacy; names are PII for kids' games)
)
question_outcomes (
  id uuid PK,                       -- client-generated per outcome
  game_id uuid FK, seq int,         -- order within game; UNIQUE(game_id, seq)
  pack_id uuid, question_id text,   -- stable identity
  pack_version text, content_hash text,  -- version/ text snapshot guard
  category text, difficulty text NULL,
  seat int, correct boolean, is_championship boolean,
  asked_at timestamptz
)
feedback (
  id uuid PK,                       -- client-generated
  client_id uuid, game_id uuid NULL,
  pack_id uuid, question_id text, pack_version text, content_hash text,
  question_text text, answer_text text,   -- snapshot for reviewer
  reason text CHECK (reason IN ('wrong_answer','unclear','offensive','outdated','duplicate','other')),
  note text NULL (max 500), created_at timestamptz,
  status text DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed'))
)
review_decisions (
  id uuid PK DEFAULT gen_random_uuid(),
  feedback_id uuid FK, pack_id uuid, question_id text,
  decision text CHECK (decision IN ('keep','edit','remove','dismiss')),
  patch jsonb NULL,                 -- {questionText?, answerText?, tidbits?, difficulty?}
  rationale text, decided_by text,  -- 'admin:<id>' | 'llm:<model>'
  decided_at timestamptz, applied_at timestamptz NULL,
  batch_id uuid NULL                -- for idempotent batch apply
)
```

Derived "question stats" for the admin page = a view over `question_outcomes` grouped by `(pack_id, question_id)`: times asked, % correct, feedback count. Index on `(pack_id, question_id)` for both tables.

Notes:
- Group multiple feedback rows for the same `(pack_id, question_id, content_hash)` into one queue item in the UI/export (dedupe at read time, not write time).
- `content_hash` = SHA-256 of normalized `questionText|answerText|choices` computed on the client (existing `services/checksum.ts` is available). A changed hash after an applied edit means old feedback is stale and auto-closes.
- Store enums as `text + CHECK` (not PG enums) to keep migrations simple.

## Decision 3: Outbox / Sync Design

**Store:** new idb-keyval store `createStore('trivial-world-outbox','outbox')`; key = item uuid; value `{id, kind:'game'|'feedback', payload, attempts, nextAttemptAt, createdAt}`. Never share the pack-cache store.

**Idempotency:** payload `id` is client-generated before enqueue; server `ON CONFLICT (id) DO NOTHING` and returns 200/201 either way. A game and all its outcomes are ONE request (`POST /api/v2/games` with `{game, players, outcomes[]}`) written in a single transaction -> no partial game on the server, no ordering dependency between items. Feedback is independent items. Feedback with `game_id` referencing a game not yet uploaded must not FK-fail: either make `feedback.game_id` a soft reference (no FK) or order flush (games before feedback). Prefer no FK.

**Flush triggers (primary = in-page, works everywhere):**
1. App boot (after hydrate), 2. `window` `online` event, 3. `visibilitychange` -> visible, 4. immediately after enqueue, 5. optional 60s timer while open.
`navigator.onLine` is only a hint: always attempt fetch and let failure drive backoff.
**Background Sync API** (`registration.sync.register('tw-outbox')`) is Chromium-only (no Safari/Firefox). Treat as progressive enhancement: SW `sync` handler reads the same IDB store and POSTs. Because iOS is a primary PWA target, the in-page flush must be fully sufficient. Recommend shipping in-page first; add BG Sync as a late, optional task. Workbox `workbox-background-sync` plugin exists but wraps *failed requests* in its own IDB queue, which would fight a domain-level outbox; do not use it.

**Retry/backoff:** exponential with jitter (e.g. 5s, 30s, 2m, 10m, 1h cap), `nextAttemptAt` persisted. 4xx (except 408/429) = permanent: move to a `dead` state, keep for debugging, stop retrying (schema bug must not loop forever). 5xx/network = retry. Single-flight guard via `navigator.locks.request('tw-outbox-flush', ...)` (fallback: in-memory flag) so two tabs/SW don't double-send (still safe thanks to idempotency).

**SW interplay:** add an explicit `registerRoute(({url}) => url.pathname.startsWith('/api/v2/'), new NetworkOnly())` so no strategy or future catch-all caches POST/GET API data; and confirm `NavigationRoute` is not matching API (it only matches navigations). Admin GET responses must not be cached. SW updates use `skipWaiting`; an in-flight flush is idempotent so a mid-flush SW swap is harmless.

**Storage eviction:** call existing `requestPersistentStorage()` once when first outbox item is written (iOS Safari may evict IDB of non-installed sites after ~7 days idle; outbox loss is tolerable but note it).

**Gameplay never blocks:** `enqueue` is fire-and-forget (`void enqueue(...).catch(log)`), wrapped so exceptions cannot propagate into `markAnswer`.

## Decision 4: Hooking into gameStore (undo-safe)

Principle: **do not emit per-mark events to the outbox. Keep a draft log and finalize once.**

- Add to gameStore: `gameId: string | null`, `startedAt: string | null`, `outcomeLog: OutcomeDraft[]` (persist via `partialize` in sessionStorage so a reload mid-game keeps it; today `currentQuestion` is NOT persisted, but `phase`, `questionNumber` are, so persisting the log is consistent).
- `startGame()` success branch (inside the existing `set({... phase:'selecting' ...})`): add `gameId: crypto.randomUUID()`, `startedAt: now`, `outcomeLog: []`. Failure path unchanged (no recording).
- `markAnswer(correct)`: after the snapshot is captured and before state mutation, append `{seq: outcomeLog.length, packId, questionId, packVersion?, contentHash, category, seat: currentPlayerIndex, correct, isChampionship, askedAt}`. The question's pack id is **not on the `Question` object** today; the log needs it. Resolve from `playerPackIdLists[currentPlayerIndex]` is ambiguous for combos -> better to stamp `packId` onto the question when `questionProvider` pools (`fetchWebPackQuestions(pid)` knows pid) so a `sourcePackId` travels with the question. This is the main modification to `questionProvider` (add a non-persisted field, strip it from `Question` Zod type or extend a local type).
- `undoLastMark()`: pop the last `outcomeLog` entry (snapshot restore + `outcomeLog` truncation to `snapshot.outcomeLogLength`). Easiest robust approach: add `outcomeLogLength` to `MarkSnapshot` and `outcomeLog.slice(0, snapshot.outcomeLogLength)` on undo. This also handles a mark that ended the game: undo from `finished` must **cancel the finalization**.
- Finalization must therefore be delayed or reversible. Because undo is only available while `lastMarkSnapshot` exists (cleared at next `selectCategory`), the win screen can undo. Options: (a) finalize on leaving the `finished` phase (navigating away from results / `resetGame`/new `startGame`) or after a short grace; (b) finalize on `finished` with idempotent `gameId`, and on undo-from-finished re-enqueue overwriting is not possible. **Choose (a):** finalize when results screen is exited, plus a `pagehide`/boot-time recovery: on boot, if persisted state has `phase==='finished'` and a `gameId` not yet enqueued -> finalize. Track `recordedGameIds` in the outbox DB to prevent double-enqueue.
- `resetGame()` mid-game: finalize as `abandoned` only if `outcomeLog.length >= N` (e.g. 3) so accidental games don't pollute stats; otherwise drop. Reasonable product call; flag to requirements.
- `skipQuestion()`: not an outcome. Optionally record `skipped` count; skip from MVP.
- Place the recorder as a **separate module called from gameStore actions** (not a `useGameStore.subscribe` diff). Subscribing and diffing `questionNumber` is brittle with undo; explicit calls at 4 sites are simpler and testable. Keep the calls try/catch-wrapped.
- Winner: `winner` is stored as a Player object; record `winner_index = currentPlayerIndex` at win time. Never send player names.

## Decision 5: Feedback Entry Point

- `QuestionCard` is a presentational component with props (see `QuestionCardProps`). Add an optional `onFlag?: () => void` prop and a small flag icon button; `app/game/question.tsx` owns the handler and opens a bottom-sheet/modal (reason chips + optional note, 2 taps minimum). Respect "eyes-up": the button is small and secondary, hidden until answer revealed is acceptable (conductor sees answer then) but flag-before-reveal is also valid ("question unclear").
- Builds feedback payload from `currentQuestion` + `sourcePackId` (same stamping as above) + `gameId`, enqueues to the outbox, shows a toast "Thanks, flagged". Does not alter game state or phase.
- Dedupe in UI: once flagged in this game, show a checked state (local component state / small set keyed `packId:questionId`).

## Decision 6: Admin Page Placement

Options: (a) route inside the mobile Expo app, (b) generator app, (c) separate app.

- Generator is static-export and dev/local-oriented with no runtime or auth; putting a protected admin there needs a separate Netlify site and cross-origin calls. Its React/Tailwind stack is nicer for tables, but the origin mismatch (CORS + cookie) is the cost.
- Mobile route `/admin` shares origin with the functions (cookies "just work"), but ships admin UI code in the player bundle and the PWA precache (the SW NavigationRoute will serve it) and Tamagui is mobile-oriented.

**Recommendation: a small separate `apps/admin` is overkill; build the admin page as a lazily-loaded Expo Router route `app/admin/*` in the mobile web app, with the real protection enforced server-side.** Reasons: same origin (no CORS/cookies issue), one deploy, reuse `@trivial-world/types`, Expo Router supports it. Security does not depend on route obscurity: all `/api/v2/admin/*` endpoints require auth. Mitigations: keep the admin bundle small via route-level code split (Expo Router web does per-route async bundles only with `asyncRoutes` enabled — verify; otherwise the cost is acceptable), exclude `/admin` from SW precache if feasible, and add `noindex`. If the team prefers Tailwind/Next DX, the alternative is generator-as-admin on a third origin with a proxy redirect `/admin/* -> generator site`; not recommended for v13.0.

**Auth for admin (recommendation):** single-owner tool -> a long random `ADMIN_TOKEN` env var exchanged at `/api/v2/admin/login` for an HttpOnly, SameSite=Strict, Secure signed cookie (constant-time compare, rate-limited). Zero user accounts, matches "no accounts" constraint. Google login only if multiple admins are needed (Supabase Auth makes this cheap; Netlify path needs an OIDC lib). Players never authenticate.

## Decision 7: LLM Review API Shape

Auth: separate `REVIEW_API_KEY` bearer (distinct from admin cookie so it can be rotated/revoked independently).

```
GET  /api/v2/review/export?status=open&limit=50&cursor=...
  -> { exportId, generatedAt, items: [{
        feedbackKey: "<packId>:<questionId>:<contentHash>",
        question: { packId, packName, questionId, packVersion, category, difficulty,
                    questionText, answerText, choices?, tidbits? },   // CURRENT text from pack file/snapshot
        stats: { timesAsked, pctCorrect },
        feedback: [{ id, reason, note, createdAt }],                   // grouped
        stale: boolean                                                  // content_hash differs from current pack
      }], nextCursor }

POST /api/v2/review/apply
  body: { batchId: uuid, decisions: [{ feedbackKey, decision: 'keep'|'edit'|'remove'|'dismiss',
          patch?: { questionText?, answerText?, tidbits?, choices?, correctChoiceIndex? }, rationale }] }
  -> { applied: n, skipped: [{feedbackKey, reason}] }   // idempotent on batchId
```

- Server writes `review_decisions` rows (`decided_by = 'llm:<model>'`), sets matching `feedback.status` (`resolved` for keep/edit/remove, `dismissed` for dismiss). Whether LLM decisions take effect immediately vs land as `proposed` for human approval is a product choice; **recommend a `proposed` state** for LLM `edit`/`remove` (admin page approves), auto-resolve only `dismiss/keep` optionally. Add `status` on decisions: `proposed|approved|applied|rejected`.
- Export must carry full question context so the LLM needs no extra calls. Server needs question text: either snapshot stored in `feedback` (already planned) or reads pack JSON. Snapshot is robust; "current text" requires bundling the packs into the function or fetching `/packs/<id>.json` over HTTP. Use snapshot-at-feedback-time and also compute `stale` using the latest pack checksum from `/api/v1/packs.json`.
- Zod: `ReviewExportResponseSchema`, `ReviewApplyRequestSchema` in `packages/types`; validate both directions; cap batch size (e.g. 100).
- JSON output is LLM-friendly (flat, string enums, rationale required). Also offer `?format=jsonl` optionally; not needed for MVP.

### Flowing approved decisions back into pack JSON

The packs are git-tracked static files, so the source of truth stays in git; the DB is a *review queue*, not the content store.

1. New CLI `pnpm apply-reviews` (place beside `apps/generator/scripts/review.ts`, sharing `scripts/lib`): fetches `GET /api/v2/review/decisions?status=approved&applied=false` (reviewer-token-protected).
2. For each decision, locates `apps/mobile/public/packs/<file>` by `metadata.id`, finds question by `id`, verifies `content_hash` matches (else skip as stale), then applies `edit` (merge patch, re-validate with `QuestionSchema`) or `remove` (drop; refuse if pack falls under 20 questions, the `QuestionPackSchema` min).
3. Recomputes `categoryCounts`, `totalQuestions`, `checksum` (reuse the existing checksum logic), `size`, bumps `metadata.version` patch + `updatedAt`, and updates `public/api/v1/packs.json` index.
4. Writes a summary and marks decisions `applied` via the API only after the user commits (`--mark-applied` flag after commit, or on next deploy). Human reviews the git diff, commits, Netlify redeploys; PWA picks up the new checksum through the existing SWR pack-index update flow.
5. Never have the function mutate pack files at runtime (deploys are static and immutable).

Pitfall: editing a question text under the same `id`+version leaves clients with stale IDB cached packs only if checksum is not bumped: existing checksum-based update detection handles it as long as step 3 runs.

## Shared Zod Contracts (packages/types)

New files, exported from `index.ts` with the existing `.js` suffix style, and added to `json-schema.ts` if useful for the LLM prompt:

| Schema | Used by |
|--------|---------|
| `OutcomeDraftSchema`, `GameRecordSchema` (game + players + outcomes[]) | recorder, `POST /games` |
| `FeedbackSubmissionSchema` (+ `FeedbackReasonSchema`) | feedback sheet, `POST /feedback` |
| `OutboxItemSchema` (discriminated union on `kind`) | outbox read/validate on flush (guards against corrupted/old IDB items) |
| `ReviewExportResponseSchema`, `ReviewApplyRequestSchema`, `DecisionSchema` | export/apply handlers, CLI, LLM prompt |
| `AdminFeedbackItemSchema`, `QuestionStatsSchema` | admin UI + handlers |

Include a `schemaVersion` field on the game and feedback payloads: outbox items may sit in IDB across app updates; the server must accept old versions.

## Identity Model

Recommend **anonymous per-install `clientId`** (UUID in the outbox DB / localStorage, not a login): enables per-device rate limiting and abuse triage without accounts. Add to every payload. Reject only on schema/size/rate. Admin = single token. This satisfies "no accounts" and requires no login UI.

## Anti-Patterns to Avoid

| Anti-Pattern | Why bad | Instead |
|--------------|---------|---------|
| Key outcomes by `questionId` alone | ids are pack-scoped slugs; collisions across packs | `(packId, questionId)` + `contentHash` |
| Writing outbox per `markAnswer` | undo creates wrong data; partial games | draft log in store, finalize once, undo truncates |
| Subscribing to store and diffing | brittle with undo/reset/rehydrate | explicit calls at lifecycle sites |
| Outbox in sessionStorage or the pack-cache IDB store | lost on tab close / pack eviction code touches it | dedicated IDB DB |
| Relying on Background Sync alone | not on Safari/Firefox | in-page flush primary |
| Using workbox-background-sync | second queue fighting domain outbox | custom outbox |
| Cached API in SW | stale admin data / swallowed POST | `NetworkOnly` for `/api/v2/*` |
| Function writing pack files | static immutable deploys | CLI applies decisions into git |
| Sending player names | PII, kids | seat indices only |
| Awaiting network in `markAnswer`/`startGame` | violates offline-first | fire-and-forget |
| Reusing `/api/v1/*` path | collides with static pack index + header rules | `/api/v2/*` |

## Suggested Build Order (phases)

Numbering continues from Phase 24; use 25+.

1. **Contracts + backend skeleton + DB** — `packages/types` schemas; `apps/api` package, Netlify `[functions]` wiring, migrations, `POST /games` and `POST /feedback` (idempotent upsert), `/statusz`-style health; vitest on handlers. Deliverable: curl-able API on a deploy preview. *Gates everything; needs research flag for functions-directory path and DB provisioning.*
2. **Client outbox + sync engine** — `outbox.ts` (IDB, backoff, single-flight, dead-letter), flush triggers, SW `NetworkOnly` route; tested with fake-indexeddb + mocked fetch. Depends on 1's contract only (can use a mock server). Standard patterns.
3. **Game recording** — gameStore changes (`gameId`, `outcomeLog`, snapshot length, undo truncation), `sourcePackId` stamping in `questionProvider`, finalize/abandon/boot-recovery. Heaviest test surface: undo-then-win, undo-after-wrong, reset mid-game, reload mid-game, double finalize. Depends on 2.
4. **Question feedback UI** — flag button, sheet, enqueue. Depends on 2 (and `sourcePackId` from 3). Small.
5. **Admin review page** — token login + cookie, `GET /admin/feedback` grouped with stats view, resolve/dismiss, route in the Expo app. Depends on 1 data; can start in parallel with 4 once rows exist.
6. **Review API + CLI round trip** — export/apply endpoints, `review_decisions`, proposed/approved flow in admin page, `pnpm apply-reviews` pack patcher with checksum/version bump. Depends on 5 (approval UX) and 1.
7. **(Optional) Hardening** — Background Sync enhancement, rate limiting, retention/cleanup, data-export docs.

Ordering rationale: contracts and server first because both client halves target them; outbox before recorder/feedback because both are producers; admin before LLM API because the human approval path is the safety net for LLM decisions.

**Research flags:** Phase 1 (Netlify functions dir outside base, DB provisioning/vendor choice, local dev); Phase 6 (pack mutation/checksum semantics: reuse of existing checksum code, index regeneration). Phases 2-4 use standard patterns. Phase 5: verify Expo Router web route-splitting and SW precache exclusion.

## Scalability Considerations

| Concern | ~100 games/day | ~10K/day | 1M/day |
|---------|----------------|----------|--------|
| Writes | single txn per game, trivial | add connection pooling (Neon pooled/serverless driver) | batch/queue ingestion |
| Stats query | live view | materialized view refreshed periodically | rollup tables |
| Abuse | size caps + per-IP/clientId rate limit | WAF/edge rate limit | n/a for this product |

## Confidence

| Area | Confidence | Notes |
|------|------------|-------|
| Integration points in gameStore/packCache/SW | HIGH | read from source |
| Data model & outbox design | HIGH | standard idempotent-outbox pattern |
| Netlify functions placement/relative dir | MEDIUM | needs deploy-preview verification |
| Supabase vs Netlify trade-offs | MEDIUM | from general knowledge, not re-verified against current vendor docs |
| Background Sync browser support | MEDIUM | Chromium-only per long-standing status; recheck if relying on it |
| Expo Router async route splitting for admin | LOW | not verified |

## Sources

- Repo files: `apps/mobile/stores/gameStore.ts`, `services/packCache.web.ts`, `services/platformStorage.ts`, `services/questionProvider.ts`, `public/sw-template.js`, `public/_redirects`, `public/_headers`, `packages/types/src/question-pack.ts`, `netlify.toml`, `apps/*/netlify.toml`
- No external sources fetched this session; vendor and browser-support claims are from prior knowledge (verify before phase planning).
