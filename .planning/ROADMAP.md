# Roadmap: Trivial World

## Milestones

- ✅ **v1.0 Core Gameplay** — Phases 1–5 (shipped 2026-06-08)
- ✅ **v2.0 Question Packs & Game Configuration** — Phases 6–8 (shipped 2026-06-08)
- ✅ **v3.0 Web Deployment** — Phases 9–11 (shipped 2026-06-11)
- ✅ **v4.0 Simplified Gameplay** — Phases 12–17 (shipped 2026-06-12 → 2026-06-13)
- ✅ **v5.0 Content Generation Tooling** — Phases 16–17 (shipped 2026-06-13)
- 🚧 **v6.0 Pack Combos** — Phase 18 (in progress)

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

<details open>
<summary>🚧 v6.0 Pack Combos (Phase 18) — IN PROGRESS</summary>

### Phase 18: Pack Combos

**Goal:** Allow mixing and matching multiple question packs. A combo is a named blend of 2+ packs, selectable at the game level or per-player, exactly where a single pack is selected today. At question-draw time, questions are pooled across all packs in the combo, respecting existing category and difficulty filters.

**Plans:** 4 plans

Plans:
- [ ] 18-01-PLAN.md — Type contracts: PackCombo schema, Player.comboId, GameState.playerPackIdLists
- [ ] 18-02-PLAN.md — packStore combo storage + CRUD (savedCombos, activeComboId, create/delete/select, persisted)
- [ ] 18-03-PLAN.md — Multi-pack runtime: playerStore mutual exclusion, gameStore combo resolution + reset + threading, questionStore/questionProvider pooling, test updates
- [ ] 18-04-PLAN.md — UI: combos management screen, route + entry link, setup per-player source picker (pack/combo/default)

Wave structure:
- Wave 1 (parallel): 18-01 (types), 18-02 (packStore)
- Wave 2: 18-03 (runtime logic) — depends on 18-01, 18-02
- Wave 3: 18-04 (UI) — depends on 18-01, 18-02, 18-03

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
| 18. Pack Combos | v6.0 | 0/4 | Planned | — |

---

*Roadmap created: 2026-06-08*
*v1.0 shipped: 2026-06-08*
*v2.0 shipped: 2026-06-08*
*v3.0 shipped: 2026-06-11*
*v4.0 shipped: 2026-06-12*
*v5.0 shipped: 2026-06-13*
