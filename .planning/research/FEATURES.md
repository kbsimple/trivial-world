# Feature Landscape: v13.0 Game History & Question Feedback Backend

**Domain:** Casual in-person trivia PWA, adding a stateful backend (game recording, question feedback, admin review, LLM batch review)
**Researched:** 2026-11-14
**Overall confidence:** MEDIUM. Findings come from training knowledge of Jackbox, Kahoot, Heads Up, Trivia Crack and common moderation-queue tooling. No live web verification was done in this pass. Items marked LOW need validation.

## Identity Recommendation (one answer)

**Recommend: anonymous, install-scoped device ID (random UUID generated client-side, stored in IndexedDB). No login in v13.0. Defer Google sign-in.**

| Criterion | Anonymous device ID | Optional Google sign-in | Fully anonymous (no ID) |
|-----------|--------------------|-------------------------|--------------------------|
| User expectation | Invisible. Matches Jackbox/Heads Up/Kahoot guest play, where no one expects a login to start a party game. | Accepted only if optional and never on the path to starting a game. | Fine for users, but weak for the operator. |
| Friction | Zero | Adds a prompt, consent screen and a "why?" question. It conflicts with the "no accounts" constraint. | Zero |
| Privacy (GDPR/children) | Pseudonymous ID is still personal data under GDPR in theory, but it holds no name or email. Player names are local free text and should NOT be uploaded (or should be hashed or dropped). Children play, so sending no PII is the safest posture (COPPA/GDPR-K). | Collects email and profile, which brings a privacy policy, deletion flow and age gating. | Best |
| Value delivered | Rate-limiting, dedupe of feedback per device, abuse control, "my device's history". No cross-device history. | Cross-device history. But the conductor is a rotating role at a party and the value is low. | No dedupe. Spam and abuse are hard to throttle. |
| Implementation ease | Easy: UUID in IDB plus a header or body field. | Hard: OAuth, session or JWT, account linking, merge. | Easiest, but no abuse control. |

Why: the stated value of the backend is operator-side (question quality, game analytics), not user-side. The device ID is enough for dedupe and rate limits. Cross-device history is a differentiator nobody asked for. Leave a nullable `account_id` column and an API versioning hook so sign-in can be added later without a data migration. Keep player names local-only (store player index and a slot label, not names). The ID must be resettable ("clear history" clears it) to keep it defensible under GDPR.

## Table Stakes

| Feature | Why Expected | Complexity | Dependencies on existing |
|---------|--------------|------------|--------------------------|
| Anonymous device ID generation and persistence | Prerequisite for dedupe and rate limits | Low | idb-keyval already in the app |
| Per-game summary record (start/end time, player count, winner, packs/difficulty, championship reached, completed vs abandoned) | Core of "record games played" | Med | Hooks into game store start/win. The `packMode`, `playerPackIds`, `playerDifficulties` snapshots already exist. |
| Per-question outcome record (question id, pack id and version, category, difficulty, correct/incorrect, order in game) | Needed for stats and feedback context | Med | Mark-correct/incorrect and undo. Undo MUST rewrite or remove the outcome, or stats are corrupted. |
| Client-generated game ID (UUID) and idempotent upload | Offline retries must not duplicate | Low-Med | Generated at game start |
| Offline outbox in IndexedDB with retry and backoff, flush on online/app-open/game-end | Offline-first is a hard constraint. Gameplay never blocks on the network. | Med | Existing IDB layer and service worker. Background Sync is not available on iOS Safari, so flush on app open and `online` events. |
| Fire-and-forget semantics (no spinner, no blocking, silent failure) | "Eyes-up" flow | Low | |
| Stable question identity (pack id plus question id, plus content hash or pack version) | Feedback and stats must map to the right text after pack edits | Med | Pack JSON schema. Check that question IDs are stable across pack regenerations. |
| Flag button on the reveal/answer screen (not the question screen) | Reasons are clearer once the answer is visible. Not mid-read. | Low | Reveal screen with tidbits already exists |
| Reason taxonomy, single tap, optional note | Standard in feedback tools | Low | |
| Brief non-blocking confirmation (toast or "Flagged" state on the button) | Prevents double submits and gives assurance | Low | |
| Dedupe: one open flag per device per question per reason, and local "already flagged" state | Prevents spam and duplicates | Low-Med | Server unique constraint (device, question, reason) |
| Feedback queued offline in the same outbox | Same constraint as games | Low (reuses outbox) | |
| Admin page protected by auth (single shared secret or basic admin login, not player accounts) | Must not be public | Low-Med | Netlify hosting. Depends on backend choice. |
| Queue view: filter by status (open/resolved/dismissed), reason, pack | Basic triage | Med | |
| Aggregate per question: flag count, reason breakdown, latest note | Triage by volume | Med | |
| Question detail: text, options, answer, tidbits, pack, plus stats (times asked, % correct, flag count) | Context for deciding | Med | Needs outcome data |
| Resolve / dismiss with a resolution note and timestamp | Closes the loop and keeps an audit trail | Low | |
| Programmatic export of open feedback (JSONL) behind an API key | The LLM review feature | Med | |
| Batch decision apply endpoint, idempotent, validated against a schema | The LLM review feature | Med | Zod schemas in `packages/types` |

### Reason taxonomy (recommended)

Keep it to 6 or fewer. A long list is slow to use and breaks the flow.

| Code | Label | Notes |
|------|-------|-------|
| `wrong_answer` | Answer is wrong | Highest priority in triage |
| `ambiguous` | Unclear or multiple valid answers | |
| `outdated` | Out of date | Common in sports, tech and streaming |
| `typo` | Typo or grammar | Low severity |
| `offensive` | Offensive or inappropriate | Auto-escalate, children play |
| `too_hard` / `too_easy` | Wrong difficulty | Could be inferred from outcome stats, so treat as optional |
| `other` | Other (note required) | |

Optional free-text note: max about 280 chars, sanitized, never rendered unescaped in admin.

### Flag button placement (preserves eyes-up)

- Put a small secondary icon on the reveal screen, after the conductor has marked or is about to mark the answer. It must not compete with the correct/incorrect buttons (keep distance and visual weight low).
- Tap opens a bottom sheet with reason chips. One tap on a reason submits with no required note. "Add note" is optional inside the sheet.
- Do not show anything during question reading. Do not interrupt turn flow. Flagging must not change game state.
- Alternative (LOW confidence on UX preference): a flag button available after the game on a recap screen. This would break context, so the reveal screen is better.

## Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| In-app game history screen (list of past games on this device) | Gives users a visible payoff for the backend | Med | Can be built from local data only, with no server read. Optional for v13.0. |
| Per-question difficulty calibration (observed % correct vs labeled difficulty, flagged when mismatched) | Data-driven pack quality, feeds the generator pipeline | Med | Needs enough samples. Show n, and hide below a minimum such as 20. |
| Auto-escalation: question with N flags or any `offensive` flag is auto-hidden or pinned | Safety for a children-adjacent audience | Med | Needs a client-visible "retired question" list, so it touches the pack pipeline. |
| Retire/disable list pushed into pack distribution (retired IDs excluded from draws) | Closes the loop from review to gameplay | High | Touches pack publish, the IDB cache and service worker caching. Defer or phase it. |
| LLM decision schema with proposed fix (keep / edit / retire) and rationale, human-in-the-loop apply | Fast triage at scale | Med-High | See below |
| Stats dashboard: games per day, completion rate, popular packs, category correct rates | Operator insight | Med | |
| Admin bulk actions (resolve all for a question, multi-select) | Speed | Low-Med | |
| Admin "apply suggested edit to pack file" via a PR or CLI export | Ties into the existing CLI generate/review pipeline | High | |

## LLM Batch Review Design (recommended)

**Export:** JSONL, one question per line (grouped by question, not per feedback item), so the LLM sees all complaints about a question together. Cap at a configurable batch size (for example 50 lines).

```json
{"question_ref":"<packId>:<questionId>","content_hash":"sha256:...",
 "pack":"...","category":"green","difficulty":"hard",
 "question":"...","options":["..."],"answer":"...","tidbits":"...",
 "feedback":[{"id":"fb_1","reason":"wrong_answer","note":"...","created_at":"..."}],
 "stats":{"times_asked":42,"pct_correct":0.12,"flag_count":3}}
```

**Decision schema** (one JSON object per line, Zod-validated, shared in `packages/types`):

```json
{"question_ref":"...","content_hash":"sha256:...",
 "decision":"keep|edit|retire",
 "feedback_ids":["fb_1"],
 "proposed":{"question":"...","answer":"...","tidbits":"..."},
 "rationale":"...","confidence":0.0}
```

Rules:
- `content_hash` must match the current question at apply time, otherwise reject as stale (optimistic concurrency). This prevents applying decisions to a question that was edited meanwhile.
- Idempotency: a `batch_id` plus per-decision key (`question_ref` plus `feedback_ids`). Re-applying the same batch is a no-op. Return per-item results (applied, skipped, stale, invalid).
- Human-in-the-loop: the API only records decisions as `proposed` by default. A human approves in the admin page (or via an explicit `auto_apply` flag restricted to `keep`/`dismiss`). `edit` and `retire` should require human approval at first. Retire is the riskiest decision.
- Applying an `edit` updates feedback status to `resolved`, stores the proposed text and rationale as an audit record, and emits a patch for the pack pipeline. It does not mutate shipped pack files directly.
- Dry-run mode (`?dry_run=true`) validates and reports without writing.
- Auth: separate API key (bearer token) from the admin session. Scope it to export and decisions only.
- Treat feedback notes as untrusted input (prompt-injection risk). Delimit them in the export and tell the reviewer prompt to treat notes as data.

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Mandatory login or login-gated flagging | Violates the no-accounts constraint and kills party flow | Anonymous device ID |
| Uploading player names | PII risk, children, no value to the operator | Upload player count and slot index only |
| Blocking gameplay on sync, or showing sync errors mid-game | Breaks offline-first and eyes-up | Silent outbox with retry |
| Required note or long form for feedback | Nobody types during a party | Single-tap reasons, note optional |
| Flagging mid-question read | Interrupts the conductor | Reveal screen only |
| Real-time leaderboards or public global rankings | Out of scope. Would also encourage cheating and need identity. | Private per-device history only |
| LLM auto-editing or auto-retiring questions without review | Hallucinated "fixes" would corrupt packs | Propose, human approves |
| Public feedback or admin endpoints without rate limiting | Spam and abuse | Per-device and per-IP rate limits, size caps |
| Using client time as a source of truth | Clock skew from offline devices | Store client timestamp but also record server received_at |
| Per-keystroke or per-event analytics tracking | Privacy, scope creep | Record only the game summary and outcomes at game end |
| Social features (share results, friend lists) | Needs accounts | Out of scope |

## Feature Dependencies

```
Device ID ──> Game upload (idempotent via client gameId) ──> Outcome stats
Device ID ──> Feedback submit (dedupe, rate limit)
Offline outbox ──> Game upload, Feedback submit
Stable question identity (+ content hash) ──> Outcomes, Feedback, LLM stale-check
Undo handling in outcome capture ──> Correct stats
Outcome stats ──> Admin question detail, Difficulty calibration
Feedback aggregation ──> Admin queue ──> LLM export ──> Decision apply (human approval)
Admin auth ──> Admin queue; API key auth ──> LLM export/apply
Decision apply ──> (later) Retire list in pack distribution
```

## MVP Recommendation

Prioritize, in this order:
1. Backend plus anonymous device ID, stable question identity, shared Zod schemas.
2. Offline outbox and idempotent game and outcome upload (including undo correctness).
3. Feedback button, reasons, dedupe, confirmation (reuses the outbox).
4. Admin queue with filters, per-question aggregates and stats, resolve/dismiss.
5. LLM export (JSONL) and decision apply with content-hash stale check, idempotency, and human approval.

Defer:
- In-app history screen: nice but not needed for operator value. Could be a small add-on from local data.
- Difficulty calibration: needs data volume first. Collect outcomes now, display later.
- Retire list distributed to clients: High complexity and touches the pack pipeline. Phase after the review loop works.
- Google sign-in and cross-device history: only revisit if users ask for it.

## Phase Flags

- Outbox/sync and undo-consistent outcome capture: most likely to need deeper research (iOS Safari lacks Background Sync, IDB eviction, retry semantics).
- Admin auth and API key scheme: depends on the hosting choice from STACK research.
- Question identity stability across pack regeneration: verify in the existing pack schema before the schema design.
- LLM export/apply: standard patterns, little research needed beyond schema design.

## Sources (all LOW to MEDIUM, from general knowledge; not live-verified)

- General patterns from Jackbox, Kahoot guest play, Heads Up, Trivia Crack (no-login casual play, optional accounts for persistence).
- General content-moderation and bug-triage queue patterns (status/reason filters, aggregation, resolution notes).
- Offline outbox pattern with idempotency keys (standard PWA practice).
- GDPR/COPPA general guidance on pseudonymous identifiers (not legal advice; confirm before launch).
