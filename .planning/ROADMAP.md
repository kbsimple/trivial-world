# Roadmap: Trivial World

## Overview

Trivial World is a mobile trivia game for in-person social play. v1.0 (Phases 1-5) delivered core gameplay: game setup, conductor interface, die rolls, question management, scoring, and state persistence. v2.0 (Phases 6-8) added question packs, AI generation, and game configuration — enabling custom content and cloud-delivered question packs. v3.0 (Phases 9-11) adds web deployment with PWA installability.

## Milestones

- **v1.0 Core Gameplay** - Phases 1-5 (shipped 2026-06-08)
- **v2.0 Question Packs & Game Configuration** - Phases 6-8 (shipped 2026-06-08)
- **v3.0 Web Deployment** - Phases 9-11 (shipped 2026-06-11)
- **v4.0 Simplified Gameplay** - Phases 12-15 (shipped 2026-06-12)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 Core Gameplay (Phases 1-5) - SHIPPED 2026-06-08</summary>

### Phase 1: Game Setup & Conductor Interface
**Goal**: Game conductor can set up a new game and see questions clearly displayed
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, COND-01, COND-02, COND-03, COND-04, COND-05
**Success Criteria** (what must be TRUE):
  1. Game conductor can create a new game session from the main screen
  2. Game conductor can add, name, and remove participants before starting
  3. Game conductor can start the game when ready
  4. Game conductor sees questions in large, readable text with category and question number
  5. Game conductor can reveal answers and mark them correct/incorrect
**Plans**: 2 plans (complete)
**Completed**: 2026-06-08

### Phase 2: Game Loop & Turn Management
**Goal**: Players can take turns with die rolls and move through the game
**Depends on**: Phase 1
**Requirements**: LOOP-01, LOOP-02, LOOP-03, LOOP-04, LOOP-05
**Success Criteria** (what must be TRUE):
  1. App simulates die roll with visual animation and displays result
  2. App shows valid move choices based on die roll
  3. Game conductor can select whose turn it is
  4. App automatically advances to next player after each question
  5. App cycles through all participants in correct turn order
**Plans**: 2 plans (complete)
**Completed**: 2026-06-08

### Phase 3: Question System
**Goal**: Questions are presented from correct categories without repetition
**Depends on**: Phase 2
**Requirements**: QSTN-01, QSTN-02, QSTN-03, QSTN-04, QSTN-05
**Success Criteria** (what must be TRUE):
  1. App presents questions from all 6 categories based on board position
  2. App tracks asked questions to avoid repeating within a game
  3. Questions are stored locally for offline play
  4. Game conductor can filter categories for custom games
  5. Each category has sufficient questions for a full game
**Plans**: 2 plans (complete)
**Completed**: 2026-06-08

### Phase 4: Scoring & Win Condition
**Goal**: Players earn wedges and the game detects a winner
**Depends on**: Phase 3
**Requirements**: SCOR-01, SCOR-02, SCOR-03, SCOR-04
**Success Criteria** (what must be TRUE):
  1. App tracks each participant's score and wedge collection
  2. App awards category wedge when answering correctly on category space
  3. App detects win condition (all 6 wedges + center question correct)
  4. App displays final scores and winner at game end
**Plans**: 2 plans (complete)
**Completed**: 2026-06-08

### Phase 5: State Persistence
**Goal**: Games can be paused, resumed, and survive app interruptions
**Depends on**: Phase 4
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04
**Success Criteria** (what must be TRUE):
  1. App persists game state to local storage automatically
  2. Game can be resumed from where it left off after app close
  3. Game conductor can pause and resume game explicitly
  4. App handles background/foreground transitions without data loss
**Plans**: 2 plans (complete)
**Completed**: 2026-06-08

</details>

<details>
<summary>v2.0 Question Packs & Game Configuration (Phases 6-8) - SHIPPED 2026-06-08</summary>

### Phase 6: Question Pack Structure
**Goal**: Define and implement the question pack data structure with versioning and validation
**Depends on**: Phase 5
**Requirements**: PACK-01, PACK-02, PACK-03, PACK-04, PACK-05
**Success Criteria** (what must be TRUE):
  1. QuestionPack schema exists with categories, questions, metadata, and version field
  2. TypeScript types derived from Zod schemas for mobile and web apps
  3. WatermelonDB tables store question packs offline with lazy loading
  4. Migration infrastructure ready for existing questions (deferred per D-02)
  5. JSON Schema export available for non-TypeScript validation
**Plans**: 3 plans (complete)
**Completed**: 2026-06-08

### Phase 7: Question Generator Web App
**Goal**: Web app generates trivia questions via AI and deploys packs to cloud
**Depends on**: Phase 6
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, CLOUD-01
**Success Criteria** (what must be TRUE):
  1. Generator web app accepts topic, category, and guidance to produce questions via LLM
  2. Questions generated from source material (movies, books, TV shows, sports seasons)
  3. Multi-model fact-checking validates question accuracy
  4. Quality score calculated for each generated question
  5. Human review UI allows editing and approving before publishing
  6. Pack files deploy to Netlify with checksum verification
**Plans**: 4 plans (complete)
**Completed**: 2026-06-08

### Phase 8: Game Configuration
**Goal**: Game conductors can select packs and configure game settings
**Depends on**: Phase 7
**Requirements**: CONF-01, CONF-02, CONF-03, CONF-04, CLOUD-02, CLOUD-03
**Success Criteria** (what must be TRUE):
  1. Game conductor sees available packs with metadata in pack selection UI
  2. Game conductor can configure time limits, difficulty, and game variants
  3. Game conductor can enable/disable categories within a pack
  4. Pack details view shows category distribution and question count
  5. Pack downloads include checksum verification for integrity
  6. Pack versions tracked for update notifications
**Plans**: 4 plans (complete)
**Completed**: 2026-06-08

</details>

---

## v3.0 Web Deployment (Phases 9-11) - IN PROGRESS

### Phase 9: Mobile Web Export
**Goal**: Game app renders in web browser via Expo static export with session-only storage
**Depends on**: Phase 8
**Requirements**: WEBG-01, WEBG-02, WEBG-03, WEBG-04
**Success Criteria** (what must be TRUE):
  1. User can access game app in web browser via static export
  2. Game state persists during browser session (no IndexedDB, sessionStorage only)
  3. Native modules (haptics, orientation) degrade gracefully on web
  4. Visual parity between mobile app and web browser
**Plans**: 5 plans (complete)
**Completed**: 2026-06-09

### Phase 10: Netlify Deployment
**Goal**: Both apps deploy automatically from main branch to separate Netlify sites
**Depends on**: Phase 9
**Requirements**: GEN-01, GEN-02, NETL-01, NETL-02, NETL-03, PWA-02
**Success Criteria** (what must be TRUE):
  1. Game app deploys to Netlify from main branch automatically on push
  2. Generator app deploys to Netlify from main branch automatically on push
  3. Deep linking works on both sites (SPA redirects configured)
  4. HTTPS enforced on both sites (Netlify default)
**Plans**: 2 plans
Plans:
- [ ] 10-01-PLAN.md — Create deployment configuration files
- [ ] 10-02-PLAN.md — Netlify site creation and deployment verification

### Phase 11: PWA Manifest
**Goal**: Game app is installable on mobile devices via Add to Home Screen
**Depends on**: Phase 10
**Requirements**: PWA-01, PWA-03
**Success Criteria** (what must be TRUE):
  1. PWA manifest includes required icons (192px, 512px)
  2. Add to Home Screen works on Android Chrome
  3. Add to Home Screen works on iOS Safari
**Plans**: TBD
**UI hint**: yes

---

## v4.0 Simplified Gameplay (Phases 12-15) — SHIPPED 2026-06-12

### Phase 12: Game Store Refactor
**Goal**: Replace die/wedge state with category completion tracking; update the game flow state machine
**Depends on**: Phase 11
**Requirements**: SIMP-02, SIMP-04, SIMP-05, SIMP-06, SIMP-07, SIMP-08, SIMP-11, SIMP-12, SIMP-13
**Success Criteria**:
  1. `completedCategories` tracked per player (array of PlayerColor[], one per player index)
  2. `isChampionshipMode` tracked per player (boolean[])
  3. `selectCategory` marks category complete on correct answer and continues turn
  4. `markAnswer(false)` ends turn and advances to next player
  5. All wedge/die state fields removed from gameStore
  6. Game phase state machine: `setup → selecting → answering → championship → finished`
**Plans**: 1 plan
**Completed**: 2026-06-12

### Phase 13: Turn Flow UI
**Goal**: Replace roll/move screens with a unified turn screen showing category selection and player progress
**Depends on**: Phase 12
**Requirements**: SIMP-01, SIMP-03, SIMP-07, SIMP-14
**Success Criteria**:
  1. `/game/turn` screen shows active player name and all 6 category buttons
  2. Completed categories are visually marked (checkmark/dimmed) and not pressable
  3. Player progress strip shows each player's completed-category count
  4. Tapping a category navigates to question screen
  5. Die roll screen (`/game/roll`) and move screen (`/game/move`) are no longer in the navigation flow
**Plans**: 1 plan
**Completed**: 2026-06-12

### Phase 14: Championship Mode & Polish
**Goal**: Championship question flow, win detection, results screen, and removal of residual wedge UI
**Depends on**: Phase 13
**Requirements**: SIMP-08, SIMP-09, SIMP-10, SIMP-11, SIMP-14
**Success Criteria**:
  1. When a player completes all 6 categories, a "Championship Round" banner appears on the question screen
  2. Correct championship answer triggers the results/win screen
  3. Incorrect championship answer ends the turn; championship banner reappears on player's next turn
  4. Results screen shows winner without wedge count
  5. WedgeBadge, WedgeCollection, Die components no longer rendered in active game flow
**Plans**: 1 plan
**Completed**: 2026-06-12

---

### Phase 15: Per-Player Pack Selection
**Goal**: Allow each player to select a different question pack, so players can use different packs in the same game
**Depends on**: Phase 14
**Success Criteria**:
  1. During game setup, each player can choose their own pack independently
  2. Questions for each player are drawn from their assigned pack
  3. Category completion and championship logic respects each player's pack (enabled categories)
  4. UI clearly shows which pack each player is using during the game
**Plans**: 3 plans
Plans:
- [x] 15-01-PLAN.md — Player model: add packId field and updatePlayerPack action
- [x] 15-02-PLAN.md — Game/question store: snapshot playerPackIds and playerCategories; thread packId through selectQuestion
- [x] 15-03-PLAN.md — UI: per-player pack chip in setup, pack name in turn progress strip
**Completed**: 2026-06-12

---

## v5.0 Content Generation Tooling (Phase 16+) — COMPLETE

### Phase 16: CLI Bulk Question Generation
**Goal**: Scalable CLI pipeline to generate question packs in bulk, with decoupled review and per-question tidbits in the answer reveal
**Depends on**: Phase 15
**Success Criteria**:
  1. CLI script generates a full pack (all 6 categories) from a `--topic` argument without requiring the web generator UI
  2. Generated questions are saved immediately as a draft JSON file — generation does not block on review
  3. Each question has a `tidbits` field (interesting explanation/context shown at answer reveal time)
  4. A separate review command lets editors inspect and approve/edit draft questions before publishing
  5. Published packs are independent JSON files registered in the pack index and downloadable by the mobile app
  6. The `tidbits` field is displayed in the question reveal screen of the mobile app
**Plans**: 4 plans
Plans:
- [x] 16-01-PLAN.md — Schema: tidbits field in QuestionSchema, WatermelonDB migration 003, schema v3, Question model
- [x] 16-02-PLAN.md — CLI generate.ts: bulk generation loop, draft.ts helper, incremental draft saves
- [x] 16-03-PLAN.md — CLI review.ts: interactive approve/edit/reject + publish to public/packs/ and index
- [x] 16-04-PLAN.md — Mobile UI: tidbits display in QuestionCard after answer reveal
**Completed**: 2026-06-13

### Phase 17: Per-Player Pack and Difficulty
**Goal**: Each player can independently configure their own pack and difficulty level; a game draws questions from multiple packs simultaneously
**Depends on**: Phase 16
**Success Criteria**:
  1. During game setup, each player can select both a pack and a difficulty level independently
  2. A game can draw questions from multiple packs simultaneously (one per player)
  3. Questions are served to each player from their individually configured pack + difficulty combination
  4. Game-level default pack and difficulty serve as fallback for players without custom settings
  5. Setup UI clearly shows each player's pack and difficulty configuration
**Plans**: 2 plans
Plans:
- [x] 17-01-PLAN.md — Data layer: Player.difficultyPreference + playerStore action + gameStore playerDifficulties snapshot + questionStore/questionProvider difficulty filter
- [x] 17-02-PLAN.md — UI: difficulty chip in setup packChipRow + difficulty label in turn progress strip
**Completed**: 2026-06-13

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Game Setup & Conductor Interface | 2/2 | Complete | 2026-06-08 |
| 2. Game Loop & Turn Management | 2/2 | Complete | 2026-06-08 |
| 3. Question System | 2/2 | Complete | 2026-06-08 |
| 4. Scoring & Win Condition | 2/2 | Complete | 2026-06-08 |
| 5. State Persistence | 2/2 | Complete | 2026-06-08 |
| 6. Question Pack Structure | 3/3 | Complete | 2026-06-08 |
| 7. Question Generator Web App | 4/4 | Complete | 2026-06-08 |
| 8. Game Configuration | 4/4 | Complete | 2026-06-08 |
| 9. Mobile Web Export | 5/5 | Complete | 2026-06-09 |
| 10. Netlify Deployment | 2/2 | Complete | 2026-06-11 |
| 11. PWA Manifest | 1/1 | Complete | 2026-06-11 |
| 12. Game Store Refactor | 1/1 | Complete | 2026-06-12 |
| 13. Turn Flow UI | 1/1 | Complete | 2026-06-12 |
| 14. Championship Mode & Polish | 1/1 | Complete | 2026-06-12 |
| 15. Per-Player Pack Selection | 3/3 | Complete | 2026-06-12 |
| 16. CLI Bulk Question Generation | 4/4 | Complete | 2026-06-13 |
| 17. Per-Player Pack and Difficulty | 2/2 | Complete | 2026-06-13 |

---

*Roadmap created: 2026-06-08*
*v1.0 shipped: 2026-06-08*
*v2.0 shipped: 2026-06-08*
*v3.0 milestone started: 2026-06-09*
*v3.0 shipped: 2026-06-11*
*v4.0 shipped: 2026-06-12*
