# Roadmap: Trivial World

## Overview

Trivial World is a mobile trivia game for in-person social play. v1.0 (Phases 1-5) delivered core gameplay: game setup, conductor interface, die rolls, question management, scoring, and state persistence. v2.0 (Phases 6-8) adds question packs, AI generation, and game configuration — enabling custom content and cloud-delivered question packs.

## Milestones

- ✅ **v1.0 Core Gameplay** - Phases 1-5 (shipped 2026-06-08)
- 🚧 **v2.0 Question Packs & Game Configuration** - Phases 6-8 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>✅ v1.0 Core Gameplay (Phases 1-5) - SHIPPED 2026-06-08</summary>

### Phase 1: Game Setup & Conductor Interface ✓
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

Plans:
- [x] 01-01-PLAN.md — Foundation, stores, and game setup flow (Wave 1)
- [x] 01-02-PLAN.md — Question display and conductor actions (Wave 2)

### Phase 2: Game Loop & Turn Management ✓
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

Plans:
- [x] 02-01-PLAN.md — Die roll animation and turn state (Wave 1)
- [x] 02-02-PLAN.md — Move selection and turn cycling (Wave 2)

### Phase 3: Question System ✓
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

Plans:
- [x] 03-01-PLAN.md — Question type system and data files (Wave 1)
- [x] 03-02-PLAN.md — Question store with asked tracking (Wave 2)

### Phase 4: Scoring & Win Condition ✓
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

Plans:
- [x] 04-01-PLAN.md — Wedge tracking and win condition detection (Wave 1)
- [x] 04-02-PLAN.md — Wedge display and results screen (Wave 2)

### Phase 5: State Persistence ✓
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

Plans:
- [x] 05-01-PLAN.md — Add persist middleware to playerStore and resume detection on home screen (Wave 1)
- [x] 05-02-PLAN.md — Pause overlay and back button confirmation for game screens (Wave 2)

</details>

### 🚧 v2.0 Question Packs & Game Configuration (In Progress)

**Milestone Goal:** Enable custom question packs with AI generation and game configuration

#### Phase 6: Question Pack Structure
**Goal**: Define and implement the question pack data structure with versioning and validation
**Depends on**: Phase 5
**Requirements**: PACK-01, PACK-02, PACK-03, PACK-04, PACK-05
**Success Criteria** (what must be TRUE):
  1. QuestionPack schema exists with categories, questions, metadata, and version field
  2. TypeScript types derived from Zod schemas for mobile and web apps
  3. WatermelonDB tables store question packs offline with lazy loading
  4. Migration infrastructure ready for existing questions (deferred per D-02)
  5. JSON Schema export available for non-TypeScript validation
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — Monorepo structure and Zod schemas (Wave 1)
- [ ] 06-02-PLAN.md — WatermelonDB models and schema (Wave 2)
- [ ] 06-03-PLAN.md — Type re-exports and migration infrastructure (Wave 3)

#### Phase 7: Question Generator Web App
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
**Plans**: 4 plans
**UI hint**: yes

Plans:
- [ ] 07-01: Generator web app foundation
- [ ] 07-02: AI question generation endpoints
- [ ] 07-03: Fact-checking and quality scoring
- [ ] 07-04: Human review and publishing workflow

#### Phase 8: Game Configuration
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
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 08-01: Pack selection and download
- [ ] 08-02: Game settings UI
- [ ] 08-03: Category filtering and pack details

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Game Setup & Conductor Interface | v1.0 | 2/2 | Complete | 2026-06-08 |
| 2. Game Loop & Turn Management | v1.0 | 2/2 | Complete | 2026-06-08 |
| 3. Question System | v1.0 | 2/2 | Complete | 2026-06-08 |
| 4. Scoring & Win Condition | v1.0 | 2/2 | Complete | 2026-06-08 |
| 5. State Persistence | v1.0 | 2/2 | Complete | 2026-06-08 |
| 6. Question Pack Structure | v2.0 | 0/3 | Not started | - |
| 7. Question Generator Web App | v2.0 | 0/4 | Not started | - |
| 8. Game Configuration | v2.0 | 0/3 | Not started | - |

---

*Roadmap created: 2026-06-08*
*v2.0 phases added: 2026-06-08*
*Phase 6 plans created: 2026-06-08*