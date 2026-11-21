# Roadmap: Trivial World

## Milestones

- ✅ **v1.0 Core Gameplay** — Phases 1–5 (shipped 2026-06-08)
- ✅ **v2.0 Question Packs & Game Configuration** — Phases 6–8 (shipped 2026-06-08)
- ✅ **v3.0 Web Deployment** — Phases 9–11 (shipped 2026-06-11)
- ✅ **v4.0 Simplified Gameplay** — Phases 12–17 (shipped 2026-06-12 → 2026-06-13)
- ✅ **v5.0 Content Generation Tooling** — Phases 16–17 (shipped 2026-06-13)
- ✅ **v6.0 Pack Combos** — Phase 18 (shipped 2026-06-13)
- ✅ **v7.0 Per-Player Pack Customization** — Phase 19 (shipped 2026-06-13)
- ✅ **v8.0 Pack Selection UX Overhaul** — Phase 20 (shipped 2026-06-13)
- ✅ **v9.0 Per-Player Pack Selection Redesign** — Phase 21 (shipped 2026-06-13)
- ✅ **v10.0 Undo Last Answer** — Phase 22 (shipped 2026-06-13)
- ✅ **v11.0 Web Pack Downloading** — Phase 23 (shipped 2026-06-18)
- ✅ **v12.0 Web-Only Collapse** — Phase 24 (shipped 2026-07-18)
- 🚧 **v13.0 Game History & Question Feedback Backend** — Phases 25–30 (in progress)

## Phases

### 🚧 v13.0 Game History & Question Feedback Backend (Phases 25–30) — IN PROGRESS

- [ ] **Phase 25: Backend Foundation & Contracts** - Same-origin `/api/v2/*` Netlify Functions + Postgres, shared Zod contracts, migrations, rate limiting, secret scan
- [ ] **Phase 26: Client Outbox & Game Recording** - Offline-safe IndexedDB outbox and undo-correct recording of finished/abandoned games with anonymous install ID
- [ ] **Phase 27: Question Feedback** - Conductor flags a question from the answer-reveal screen; feedback queued and deduplicated
- [ ] **Phase 28: Google Sign-In & Game History** - Optional Google sign-in, claim guest games, cross-device "My Games" screen, identity reset
- [ ] **Phase 29: Admin Review Page** - Token-gated `/admin` queue of flagged questions with stats and resolve/dismiss
- [ ] **Phase 30: LLM Batch Review & Pack Round-Trip** - Review export/apply API with human approval and `pnpm apply-reviews` CLI

### Phase Details

### Phase 25: Backend Foundation & Contracts
**Goal**: A secure, migrated, same-origin backend exists that validates and stores game and feedback payloads without disturbing the static site, and the default test gate stays hermetic
**Depends on**: Phase 24
**Requirements**: BACK-01, BACK-02, BACK-03, BACK-04, BACK-05, BACK-06, BACK-07
**Success Criteria** (what must be TRUE):
  1. A deploy preview answers curl requests at `/api/v2/*` while `/api/v1/packs.json` and SPA deep links still work
  2. Valid game-record and feedback payloads are accepted idempotently; invalid, unknown-field, or oversized payloads are rejected, and bursts are rate limited
  3. Schema migrations apply automatically on deploy and a deploy preview never writes to the production database
  4. `/statusz` shows database reachability next to pack health
  5. CI fails when a server secret appears in `dist/`, and `npx vitest run` passes without a live database (DB integration tests run via a separate script)
**Plans**: 9 plans (6 waves)

Plans:
- [x] 25-01-PLAN.md — Spike A: pre-flight (credit plan, site settings, package audit), user-approved netlify link, packages/api scaffold, spike functions, Node 22
- [ ] 25-02-PLAN.md — Spike B: user-approved push/draft PR; prove routing, migrations dir, Drizzle rc.5 txn, preview isolation, 429 on a live preview; record Spike Decisions
- [x] 25-03-PLAN.md — Shared strict Zod contracts (game record, feedback, review export/decisions) + root vitest projects + test:integration + repo port
- [ ] 25-04-PLAN.md — HTTP layer: body cap/413, 400 issue summary, idempotent 201/200 ingest + health handlers, in-memory repo (hermetic)
- [ ] 25-05-PLAN.md — v13 schema migration (text+CHECK, nullable account_id), lazy DB client, Postgres repo, real-Postgres integration suite, hermetic guard
- [ ] 25-06-PLAN.md — check-secrets.mjs build gate, smoke-api.mjs, tw-backend-setup executable skill
- [ ] 25-07-PLAN.md — Wire ingest (single rate rule) / health / statusz functions, composition root + D-15 disable switch, _redirects/_headers, remove spike
- [ ] 25-08-PLAN.md — Full local gates, user-approved push, preview smoke + [BLOCKING] live preview-DB migration/write verification
- [ ] 25-09-PLAN.md — User-approved production promotion, [BLOCKING] production DB + /statusz checks, post-production preview isolation proof
**Research flag**: yes (Netlify functions/migrations wiring in the two-site monorepo, Drizzle rc adapter vs SQL fallback, Node version, rate-limit layout; run deploy-preview spike first)

### Phase 26: Client Outbox & Game Recording
**Goal**: Every finished or meaningfully abandoned game is recorded exactly once and uploaded in the background, with gameplay never waiting on the network
**Depends on**: Phase 25
**Requirements**: ACCT-01, REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05
**Success Criteria** (what must be TRUE):
  1. A full game played offline has no errors or delays, and its record uploads automatically once the device is back online
  2. After undoing marks (including from the win screen), the stored game and per-question outcomes match the final game state
  3. A game abandoned after at least 3 answers is recorded as `abandoned` on next launch after ~6h idle; shorter abandoned games are discarded
  4. Retries and reconnects never create duplicate games, and the server record contains seat indexes only (no player names) plus a server `received_at`
  5. Permanently rejected items stop retrying, the local queue is size-capped, and the Service Worker never caches `/api/v2/*`
  6. Each install has an anonymous install ID attached to uploads
**Plans**: TBD
**Research flag**: yes (iOS Safari IDB eviction, `navigator.locks` fallback, finalize-vs-undo lifecycle)

### Phase 27: Question Feedback
**Goal**: Conductors can flag a bad question during play without disrupting the game, and flags reach the server reliably
**Depends on**: Phase 26
**Requirements**: FDBK-01, FDBK-02, FDBK-03, FDBK-04, FDBK-05
**Success Criteria** (what must be TRUE):
  1. A flag control appears only on the answer-reveal screen, never while the question is being read
  2. Conductor picks a reason (note required for "other"), sees a non-blocking confirmation, and the question shows as already flagged with game state unchanged
  3. Feedback submitted offline uploads later, and repeat flags for the same question and reason from one install appear once on the server
  4. A stored flag keeps the question/answer text and content hash as they were when flagged, even after the pack is edited
**Plans**: TBD
**UI hint**: yes

### Phase 28: Google Sign-In & Game History
**Goal**: Conductors can optionally sign in with Google to keep their game history across devices, while guests continue to play fully
**Depends on**: Phase 27
**Requirements**: ACCT-02, ACCT-03, ACCT-04, ACCT-05, ACCT-06
**Success Criteria** (what must be TRUE):
  1. A guest can play an entire game without ever seeing a required sign-in; Google sign-in is an optional action
  2. After signing in, the session survives a browser refresh and the conductor can sign out
  3. On first sign-in, games and feedback previously recorded under the install ID appear under the account
  4. A signed-in conductor sees a "My Games" screen (date, players, winner seat, packs, duration, status) that shows the same history on another device
  5. "Clear history / reset identity" signs the conductor out and starts a new install ID
**Plans**: TBD
**UI hint**: yes
**Research flag**: yes (provider/library choice on Netlify, Google ID token verification, session handling, account linking)

### Phase 29: Admin Review Page
**Goal**: The maintainer can review flagged questions in a protected admin page and resolve or dismiss them
**Depends on**: Phase 27
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05
**Success Criteria** (what must be TRUE):
  1. Visiting `/admin` shows only an unlock prompt until a valid admin token is entered; admin API calls without the token are rejected server-side
  2. Admin sees flagged questions grouped per question version and can filter by status, reason, and pack
  3. Question detail shows question, options, answer, tidbits, flag count, reason breakdown, notes, times asked, and % correct
  4. Admin can resolve or dismiss a flagged question with an audit note
  5. Admin responses are never cached, and user-supplied notes display as escaped text
**Plans**: TBD
**UI hint**: yes
**Research flag**: yes (Expo Router route splitting, SW precache exclusion for `/admin`)

### Phase 30: LLM Batch Review & Pack Round-Trip
**Goal**: A script or LLM can review open feedback in bulk, with human approval gating every change that reaches the packs
**Depends on**: Phase 29
**Requirements**: REVW-01, REVW-02, REVW-03, REVW-04, REVW-05
**Success Criteria** (what must be TRUE):
  1. With the review token, a script exports open feedback as per-question JSONL including context, stats, content hash, and notes marked as untrusted data
  2. A script submits batch decisions; repeats are idempotent, stale decisions are rejected by content hash, and per-item results are returned
  3. A dry-run shows what would happen without saving anything
  4. LLM `edit`/`retire` decisions appear as `proposed` in the admin page and take effect only after admin approval
  5. `pnpm apply-reviews` turns approved decisions into schema-valid pack JSON changes (checksum, version, index updated) for human git review, and the server never writes pack files
**Plans**: TBD
**Research flag**: yes (prompt-injection hygiene for export format, pack-patch semantics for checksum/version/index)

<details>
<summary>✅ v1.0 Core Gameplay (Phases 1–5) — SHIPPED 2026-06-08</summary>

- [x] Phase 1: Game Setup & Conductor Interface (2/2 plans) — completed 2026-06-08
- [x] Phase 2: Game Loop & Turn Management (2/2 plans) — completed 2026-06-08
- [x] Phase 3: Question System (2/2 plans) — completed 2026-06-08
- [x] Phase 4: Scoring & Win Condition (2/2 plans) — completed 2026-06-08
- [x] Phase 5: State Persistence (2/2 plans) — completed 2026-06-08

Archive: `.planning/milestones/v1.0-*`

</details>

<details>
<summary>✅ v2.0 Question Packs & Game Configuration (Phases 6–8) — SHIPPED 2026-06-08</summary>

- [x] Phase 6: Question Pack Structure (3/3 plans) — completed 2026-06-08
- [x] Phase 7: Question Generator Web App (4/4 plans) — completed 2026-06-08
- [x] Phase 8: Game Configuration (4/4 plans) — completed 2026-06-08

Archive: `.planning/milestones/v2.0-*`

</details>

<details>
<summary>✅ v3.0 Web Deployment (Phases 9–11) — SHIPPED 2026-06-11</summary>

- [x] Phase 9: Mobile Web Export (5/5 plans) — completed 2026-06-09
- [x] Phase 10: Netlify Deployment (2/2 plans) — completed 2026-06-11
- [x] Phase 11: PWA Manifest (1/1 plan) — completed 2026-06-11

</details>

<details>
<summary>✅ v4.0 Simplified Gameplay (Phases 12–17) — SHIPPED 2026-06-12</summary>

- [x] Phase 12: Game Store Refactor (1/1 plan) — completed 2026-06-12
- [x] Phase 13: Turn Flow UI (1/1 plan) — completed 2026-06-12
- [x] Phase 14: Championship Mode & Polish (1/1 plan) — completed 2026-06-12
- [x] Phase 15: Per-Player Pack Selection (3/3 plans) — completed 2026-06-12

</details>

<details>
<summary>✅ v5.0 Content Generation Tooling (Phases 16–17) — SHIPPED 2026-06-13</summary>

- [x] Phase 16: CLI Bulk Question Generation (4/4 plans) — completed 2026-06-13
- [x] Phase 17: Per-Player Pack and Difficulty (2/2 plans) — completed 2026-06-13

Archive: `.planning/milestones/v5.0-*`

</details>

<details>
<summary>✅ v6.0 Pack Combos (Phase 18) — SHIPPED 2026-06-13</summary>

- [x] Phase 18: Pack Combos (4/4 plans) — completed 2026-06-13

Archive: `.planning/milestones/v6.0-*`

</details>

<details>
<summary>✅ v7.0 Per-Player Pack Customization (Phase 19) — SHIPPED 2026-06-13</summary>

- [x] Phase 19: Per-Player Pack Customization (1/1 plan) — completed 2026-06-13

Archive: `.planning/milestones/v7.0-ROADMAP.md`

</details>

<details>
<summary>✅ v8.0 Pack Selection UX Overhaul (Phase 20) — SHIPPED 2026-06-13</summary>

- [x] Phase 20: Pack Selection UX Overhaul (2/2 plans) — completed 2026-06-13

Archive: `.planning/milestones/v8.0-*`

</details>

<details>
<summary>✅ v9.0 Per-Player Pack Selection Redesign (Phase 21) — SHIPPED 2026-06-13</summary>

### Phase 21: Per-Player Pack Selection Redesign

**Goal:** Correct the per-player pack selection UX. Each player row shows a "Shared" / "Custom" toggle inline with the player name. Selecting Custom navigates to the /packs page, where the user configures the pack(s) for that player; the result is persisted as that player's custom pack selection. Remove all inline Alert/Modal pickers for packs and difficulty — these interactions move to dedicated screens.

**Depends on:** Phase 20 (Pack Selection UX Overhaul)

**Plans:** 2 plans

Plans:
- [x] 21-01-PLAN.md — Refactor setup.tsx: replace two-chip row with Shared/Custom toggle, remove all inline Alert/Modal picker infrastructure
- [x] 21-02-PLAN.md — Add per-player mode to packs/index.tsx: targetPlayerId param, per-player pack/combo selection, conditional footer and title

Archive: `.planning/milestones/v9.0-*`

</details>

<details>
<summary>✅ v11.0 Web Pack Downloading (Phase 23) — SHIPPED 2026-06-18</summary>

### Phase 23: Web Pack Downloading

**Goal:** Make the web app work offline after first visit by implementing Service Worker (stale-while-revalidate for pack index, precache for app shell) + IndexedDB (durable pack body storage). Pack bodies are stored by checksum so updates are detected without invalidating unchanged packs. The `questionProvider.ts` web path checks IndexedDB before fetching; `packIndex.ts` serves the cached index when offline.

**Depends on:** Phase 22 (Undo Last Answer)

**Plans:** 6 plans

Plans:
- [x] 23-01-PLAN.md — Create packCache.ts + packCache.web.ts: Platform shim + idb-keyval IDB adapter
- [x] 23-02-PLAN.md — Service Worker layer: sw-template.js, build-sw.mjs, index.html registration, package.json deps
- [x] 23-03-PLAN.md — Wire IDB into questionProvider.ts (IDB-first fetch) and packIndex.ts (offline fallback)
- [x] 23-04-PLAN.md — Add offlinePackIds + downloadPackForOffline + refreshOfflinePackIds to packStore
- [x] 23-05-PLAN.md — packs/index.tsx: Download button + Downloaded badge per pack row (web only)
- [x] 23-06-PLAN.md — Tests: packCache.web.test.ts, packStore downloadPackForOffline, questionProvider IDB hit

Archive: `.planning/milestones/v11.0-*`

</details>

---

<details>
<summary>✅ v12.0 Web-Only Collapse (Phase 24) — SHIPPED 2026-07-18</summary>

### Phase 24: Remove Native Android/iOS Build Path — Collapse to Web/PWA-only

**Goal:** Remove the native (Android/iOS) build path and the WatermelonDB native database layer, collapsing the app to a single web/PWA target. Delete the `database/` directory, `packDownloader.ts`, native platform extensions (`.native.ts`), and the `Platform.OS` branches across stores/services/UI that gated native vs web. Remove the `@nozbe/watermelondb` and `@react-native-async-storage/async-storage` dependencies, the android/ios blocks from `app.config.js`, the `android`/`ios` npm scripts, android icon assets, and the empty `dist-ios/`. Simplify `metro.config.js` (drop the native-mock resolver) and `babel.config.js` (drop WatermelonDB decorator plugins). Rewrite the native-path tests (`questionStore.test.ts`, `packStore.test.ts`) to cover the web path; update `__mocks__/react-native.ts` to `Platform.OS = 'web'`. Update README to reflect web/PWA-only deployment. Gates: full test suite green, `tsc --noEmit` clean, `pnpm build:web` succeeds.

**Depends on:** Phase 23 (Web Pack Downloading) — the web pack cache (IndexedDB + idb-keyval) is the sole persistence layer after native removal.

**Plans:** 3 plans

Plans:
- [x] 24-01-PLAN.md — Delete native-only files/dirs/assets; strip native config from app.config.js, package.json, metro.config.js, babel.config.js; flip RN mock to Platform.OS = 'web' — completed 2026-07-18
- [x] 24-02-PLAN.md — Collapse Platform.OS branches to web-only across stores/services/UI; remove dynamic WatermelonDB imports; re-wire packStore to packCache web API — completed 2026-07-18
- [x] 24-03-PLAN.md — Rewrite native-path tests for web path; update README to web/PWA-only; run phase gates (vitest, tsc, build:web) — completed 2026-07-18

Archive: `.planning/milestones/v12.0-ROADMAP.md`

</details>

---

<details>
<summary>✅ v10.0 Undo Last Answer (Phase 22) — SHIPPED 2026-06-13</summary>

### Phase 22: Undo Last Answer

**Goal:** Allow the conductor to undo an accidentally marked answer (correct or incorrect) before a new question is selected. Snapshot the full game state before `markAnswer` runs, expose an Undo button on the turn screen, and restore the snapshot — including un-marking the question in questionStore — until the next question is picked.

**Depends on:** Phase 21 (Per-Player Pack Selection Redesign)

**Plans:** 1 plan

Plans:
- [x] 22-01-PLAN.md — Add lastMarkSnapshot + undoLastMark() to gameStore, unmarkAsked() to questionStore, and Undo affordance to turn screen

</details>

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Game Setup & Conductor Interface | v1.0 | 2/2 | Complete | 2026-06-08 |
| 2. Game Loop & Turn Management | v1.0 | 2/2 | Complete | 2026-06-08 |
| 3. Question System | v1.0 | 2/2 | Complete | 2026-06-08 |
| 4. Scoring & Win Condition | v1.0 | 2/2 | Complete | 2026-06-08 |
| 5. State Persistence | v1.0 | 2/2 | Complete | 2026-06-08 |
| 6. Question Pack Structure | v2.0 | 3/3 | Complete | 2026-06-08 |
| 7. Question Generator Web App | v2.0 | 4/4 | Complete | 2026-06-08 |
| 8. Game Configuration | v2.0 | 4/4 | Complete | 2026-06-08 |
| 9. Mobile Web Export | v3.0 | 5/5 | Complete | 2026-06-09 |
| 10. Netlify Deployment | v3.0 | 2/2 | Complete | 2026-06-11 |
| 11. PWA Manifest | v3.0 | 1/1 | Complete | 2026-06-11 |
| 12. Game Store Refactor | v4.0 | 1/1 | Complete | 2026-06-12 |
| 13. Turn Flow UI | v4.0 | 1/1 | Complete | 2026-06-12 |
| 14. Championship Mode & Polish | v4.0 | 1/1 | Complete | 2026-06-12 |
| 15. Per-Player Pack Selection | v4.0 | 3/3 | Complete | 2026-06-12 |
| 16. CLI Bulk Question Generation | v5.0 | 4/4 | Complete | 2026-06-13 |
| 17. Per-Player Pack and Difficulty | v5.0 | 2/2 | Complete | 2026-06-13 |
| 18. Pack Combos | v6.0 | 4/4 | Complete | 2026-06-13 |
| 19. Per-Player Pack Customization | v7.0 | 1/1 | Complete | 2026-06-13 |
| 20. Pack Selection UX Overhaul | v8.0 | 2/2 | Complete | 2026-06-13 |
| 21. Per-Player Pack Selection Redesign | v9.0 | 2/2 | Complete | 2026-06-13 |
| 22. Undo Last Answer | v10.0 | 1/1 | Complete | 2026-06-13 |
| 23. Web Pack Downloading | v11.0 | 6/6 | Complete | 2026-06-18 |
| 24. Remove Native Android/iOS Build Path | v12.0 | 3/3 | Complete | 2026-07-18 |
| 25. Backend Foundation & Contracts | v13.0 | 2/9 | In Progress|  |
| 26. Client Outbox & Game Recording | v13.0 | 0/TBD | Not started | - |
| 27. Question Feedback | v13.0 | 0/TBD | Not started | - |
| 28. Google Sign-In & Game History | v13.0 | 0/TBD | Not started | - |
| 29. Admin Review Page | v13.0 | 0/TBD | Not started | - |
| 30. LLM Batch Review & Pack Round-Trip | v13.0 | 0/TBD | Not started | - |

---

*Roadmap created: 2026-06-08*
*v1.0 shipped: 2026-06-08*
*v2.0 shipped: 2026-06-08*
*v3.0 shipped: 2026-06-11*
*v4.0 shipped: 2026-06-12*
*v5.0 shipped: 2026-06-13*
*v6.0 shipped: 2026-06-13*
*v7.0 shipped: 2026-06-13*
*v8.0 shipped: 2026-06-13*
*v9.0 shipped: 2026-06-13*
*v10.0 shipped: 2026-06-13*
*v11.0 shipped: 2026-06-18*
*v12.0 added: 2026-07-18*
*v12.0 shipped: 2026-07-18*
*v13.0 added: 2026-11-14*
