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

## Phases

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
