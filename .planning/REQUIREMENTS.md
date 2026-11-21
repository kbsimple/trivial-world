# Requirements: Trivial World — v13.0 Game History & Question Feedback Backend

**Defined:** 2026-11-14
**Core Value:** Enable in-person social trivia gameplay where the app supports (not replaces) human interaction — the game conductor reads questions aloud and players move together.
**Research:** `.planning/research/SUMMARY.md`

**Hard constraints carried into every requirement:** gameplay never blocks on the network (offline-first); login is always optional (guests play fully); player names never leave the device; no secrets in the client bundle.

## v13.0 Requirements

### Backend Foundation (BACK)

- [ ] **BACK-01**: Backend API is served same-origin from the game site under `/api/v2/*` (Netlify Functions + Netlify Database/Postgres) without breaking the static `/api/v1/packs.json` index or the SPA catch-all
- [ ] **BACK-02**: Request/response contracts (game record, feedback, review export, review decisions) are shared Zod schemas in `packages/types`, `.strict()`, size-capped, with a `schemaVersion`
- [ ] **BACK-03**: Database schema is managed by versioned migrations applied on deploy; deploy previews never write to the production database
- [ ] **BACK-04**: Public write endpoints reject invalid/oversized payloads and are rate limited
- [ ] **BACK-05**: `/statusz` reports backend/database reachability alongside existing pack health
- [ ] **BACK-06**: CI fails if a server secret appears in the built client bundle (`dist/`)
- [ ] **BACK-07**: Default `npx vitest run` gate stays green and hermetic (no live DB); DB integration tests run via a separate script

### Game Recording (REC)

- [ ] **REC-01**: Each finished game is recorded once: client-generated game ID, start/end time, player count, winner seat, packs/combos and difficulty per seat, championship reached
- [ ] **REC-02**: Each answered question is recorded as an outcome (pack ID, question ID, content hash, category, difficulty, correct/incorrect, seat, sequence number)
- [ ] **REC-03**: Undoing the last mark (including from the win screen) removes/corrects the corresponding outcome — recorded data always matches final game state
- [ ] **REC-04**: Games abandoned after ≥3 answered questions (tab closed or reset mid-game) are recorded with status `abandoned` on next launch after ~6h idle; games with fewer outcomes are discarded
- [ ] **REC-05**: Player names are never uploaded — players are identified only by seat index
- [ ] **REC-06**: Server stores its own `received_at` timestamp; durations do not rely on client clock alone

### Offline Sync (SYNC)

- [ ] **SYNC-01**: Game records and feedback queue locally in IndexedDB and upload automatically when online (app start, reconnect, tab visibility, game end) — no user action required
- [ ] **SYNC-02**: A full game can be played offline with no errors or delays; queued data uploads later
- [ ] **SYNC-03**: Retries never create duplicates (idempotent client IDs) and items leave the queue only after server acknowledgement
- [ ] **SYNC-04**: Permanently rejected items stop retrying (dead-letter) and the local queue is size-capped
- [ ] **SYNC-05**: Service Worker never caches or rewrites `/api/v2/*` responses

### Accounts (ACCT)

- [ ] **ACCT-01**: Every install has an anonymous, resettable install ID used to attribute guest games and feedback
- [ ] **ACCT-02**: Conductor can optionally sign in with Google; guests can always play without signing in
- [ ] **ACCT-03**: Sign-in session persists across browser refresh; conductor can sign out
- [ ] **ACCT-04**: On first sign-in, games and feedback already recorded under this install ID are linked to the account
- [ ] **ACCT-05**: Signed-in conductor can view a "My Games" history screen (date, players, winner seat, packs, duration, status) across devices
- [ ] **ACCT-06**: Conductor can clear history / reset identity: signs out and generates a new install ID

### Question Feedback (FDBK)

- [ ] **FDBK-01**: Conductor can flag the current question from the answer-reveal screen (never while reading the question) with one low-prominence control
- [ ] **FDBK-02**: Conductor picks a reason (wrong answer, ambiguous, outdated, typo, offensive, other) with an optional short note (required for "other")
- [ ] **FDBK-03**: Submitting feedback shows a non-blocking confirmation and the question shows as already flagged; gameplay state is unchanged
- [ ] **FDBK-04**: Feedback captures a snapshot of question/answer text and content hash so later pack edits don't misattribute it
- [ ] **FDBK-05**: Duplicate flags from the same install for the same question + reason are deduplicated server-side

### Admin Review (ADMN)

- [ ] **ADMN-01**: Admin can open a hidden `/admin` route and unlock it with an admin token (held for the browser session; never in the bundle; enforced server-side on every admin call)
- [ ] **ADMN-02**: Admin sees a queue of flagged questions grouped per question version, filterable by status, reason, and pack
- [ ] **ADMN-03**: Admin sees per-question detail: question, options, answer, tidbits, flag count, reason breakdown, notes, times asked, % correct
- [ ] **ADMN-04**: Admin can resolve or dismiss a flagged question with an audit note
- [ ] **ADMN-05**: Admin responses are never cached (`no-store`) and user-supplied notes render escaped

### LLM Batch Review (REVW)

- [ ] **REVW-01**: A script/LLM can export open feedback via API (separate review API token) as per-question JSONL with question context, stats, feedback items (notes delimited as untrusted data), and content hash
- [ ] **REVW-02**: A script/LLM can submit batch decisions (`keep | edit | retire | dismiss` with proposed fix, rationale, confidence, feedback IDs) — idempotent per batch, stale decisions rejected via content-hash check, per-item results returned
- [ ] **REVW-03**: Batch apply supports dry-run (preview results without saving)
- [ ] **REVW-04**: LLM `edit`/`retire` decisions land as `proposed`; admin approves or rejects them on the admin page before they take effect
- [ ] **REVW-05**: `pnpm apply-reviews` CLI turns approved decisions into pack JSON changes (schema-validated, checksum/version/index updated) for human git review and commit — server never writes pack files

## Future Requirements

Deferred. Tracked but not in this roadmap.

- **FUT-01**: Admin bulk resolve/dismiss actions
- **FUT-02**: Question difficulty calibration display (observed % correct vs labeled difficulty, ≥20 samples)
- **FUT-03**: Retired-question list pushed into pack distribution so clients skip retired questions before a pack update
- **FUT-04**: Background Sync API enhancement (Chromium only)
- **FUT-05**: Server-side deletion of records for a reset install ID / account
- **FUT-06**: Aggregate stats dashboard beyond per-question stats
- **FUT-07**: Additional identity providers (Apple, etc.)
- **FUT-08**: Data retention / cleanup policy for raw outcomes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mandatory login | Friction kills social gameplay — guests must always play fully |
| Uploading player names | Privacy (children play); seat index is sufficient |
| Public/real-time leaderboards | Not needed for in-person play |
| LLM auto-applying pack changes | Prompt-injection and quality risk — human approval always required |
| Server writing pack files directly | Packs in git remain the source of truth; changes go through CLI + human commit |
| Online multiplayer / remote play | Breaks core in-person value |
| Per-event telemetry (taps, screens) | Not needed; only game records and feedback |
| Resumable games from server | Abandoned-game mirror is for recording only, not resuming |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BACK-01 | Phase 25 | Pending |
| BACK-02 | Phase 25 | Pending |
| BACK-03 | Phase 25 | Pending |
| BACK-04 | Phase 25 | Pending |
| BACK-05 | Phase 25 | Pending |
| BACK-06 | Phase 25 | Pending |
| BACK-07 | Phase 25 | Pending |
| REC-01 | Phase 26 | Pending |
| REC-02 | Phase 26 | Pending |
| REC-03 | Phase 26 | Pending |
| REC-04 | Phase 26 | Pending |
| REC-05 | Phase 26 | Pending |
| REC-06 | Phase 26 | Pending |
| SYNC-01 | Phase 26 | Pending |
| SYNC-02 | Phase 26 | Pending |
| SYNC-03 | Phase 26 | Pending |
| SYNC-04 | Phase 26 | Pending |
| SYNC-05 | Phase 26 | Pending |
| ACCT-01 | Phase 26 | Pending |
| ACCT-02 | Phase 28 | Pending |
| ACCT-03 | Phase 28 | Pending |
| ACCT-04 | Phase 28 | Pending |
| ACCT-05 | Phase 28 | Pending |
| ACCT-06 | Phase 28 | Pending |
| FDBK-01 | Phase 27 | Pending |
| FDBK-02 | Phase 27 | Pending |
| FDBK-03 | Phase 27 | Pending |
| FDBK-04 | Phase 27 | Pending |
| FDBK-05 | Phase 27 | Pending |
| ADMN-01 | Phase 29 | Pending |
| ADMN-02 | Phase 29 | Pending |
| ADMN-03 | Phase 29 | Pending |
| ADMN-04 | Phase 29 | Pending |
| ADMN-05 | Phase 29 | Pending |
| REVW-01 | Phase 30 | Pending |
| REVW-02 | Phase 30 | Pending |
| REVW-03 | Phase 30 | Pending |
| REVW-04 | Phase 30 | Pending |
| REVW-05 | Phase 30 | Pending |

**Coverage:**
- v13.0 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0

---
*Requirements defined: 2026-11-14*
*Last updated: 2026-11-14 after roadmap creation*
