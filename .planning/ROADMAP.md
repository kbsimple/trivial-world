# Roadmap: Trivial World

## Overview

Build a mobile trivia game for in-person social play. The game conductor reads questions while the app handles die rolls, move options, scoring, and question management. Starting from game setup and basic question display, we'll layer in turn management, question selection, scoring mechanics, and finally state persistence for reliability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Game Setup & Conductor Interface** - Create games, manage participants, display questions to conductor (2026-06-08)
- [x] **Phase 2: Game Loop & Turn Management** - Die rolls, move choices, turn cycling (2026-06-08)
- [x] **Phase 3: Question System** - Category-based selection, no-repeat tracking, offline storage (2026-06-08)
- [ ] **Phase 4: Scoring & Win Condition** - Wedges, win detection, final results
- [ ] **Phase 5: State Persistence** - Save/resume, pause handling, app lifecycle

## Phase Details

### Phase 1: Game Setup & Conductor Interface ✓
**Goal**: Game conductor can set up a new game and see questions clearly displayed
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, COND-01, COND-02, COND-03, COND-04, COND-05
**Success Criteria** (what must be TRUE):
  1. Game conductor can create a new game session from the main screen ✓
  2. Game conductor can add, name, and remove participants before starting ✓
  3. Game conductor can start the game when ready ✓
  4. Game conductor sees questions in large, readable text with category and question number ✓
  5. Game conductor can reveal answers and mark them correct/incorrect ✓
**Plans**: 2 plans (complete)
**Completed**: 2026-06-08

Plans:
- [x] 01-01-PLAN.md — Foundation, stores, and game setup flow (Wave 1) ✓
- [x] 01-02-PLAN.md — Question display and conductor actions (Wave 2) ✓

### Phase 2: Game Loop & Turn Management ✓
**Goal**: Players can take turns with die rolls and move through the game
**Depends on**: Phase 1
**Requirements**: LOOP-01, LOOP-02, LOOP-03, LOOP-04, LOOP-05
**Success Criteria** (what must be TRUE):
  1. App simulates die roll with visual animation and displays result ✓
  2. App shows valid move choices based on die roll ✓
  3. Game conductor can select whose turn it is ✓
  4. App automatically advances to next player after each question ✓
  5. App cycles through all participants in correct turn order ✓
**Plans**: 2 plans (complete)
**Completed**: 2026-06-08

Plans:
- [x] 02-01-PLAN.md — Die roll animation and turn state (Wave 1) ✓
- [x] 02-02-PLAN.md — Move selection and turn cycling (Wave 2) ✓

### Phase 3: Question System ✓
**Goal**: Questions are presented from correct categories without repetition
**Depends on**: Phase 2
**Requirements**: QSTN-01, QSTN-02, QSTN-03, QSTN-04, QSTN-05
**Success Criteria** (what must be TRUE):
  1. App presents questions from all 6 categories based on board position ✓
  2. App tracks asked questions to avoid repeating within a game ✓
  3. Questions are stored locally for offline play ✓
  4. Game conductor can filter categories for custom games ✓
  5. Each category has sufficient questions for a full game ✓
**Plans**: 2 plans (complete)
**Completed**: 2026-06-08

Plans:
- [x] 03-01-PLAN.md — Question type system and data files (Wave 1) ✓
- [x] 03-02-PLAN.md — Question store with asked tracking (Wave 2) ✓

### Phase 4: Scoring & Win Condition
**Goal**: Players earn wedges and the game detects a winner
**Depends on**: Phase 3
**Requirements**: SCOR-01, SCOR-02, SCOR-03, SCOR-04
**Success Criteria** (what must be TRUE):
  1. App tracks each participant's score and wedge collection
  2. App awards category wedge when answering correctly on category space
  3. App detects win condition (all 6 wedges + center question correct)
  4. App displays final scores and winner at game end
**Plans**: TBD

### Phase 5: State Persistence
**Goal**: Games can be paused, resumed, and survive app interruptions
**Depends on**: Phase 4
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04
**Success Criteria** (what must be TRUE):
  1. App persists game state to local storage automatically
  2. Game can be resumed from where it left off after app close
  3. Game conductor can pause and resume game explicitly
  4. App handles background/foreground transitions without data loss
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Game Setup & Conductor Interface | 2/2 | Complete | 2026-06-08 |
| 2. Game Loop & Turn Management | 2/2 | Complete | 2026-06-08 |
| 3. Question System | 2/2 | Complete | 2026-06-08 |
| 4. Scoring & Win Condition | 0/TBD | Not started | - |
| 5. State Persistence | 0/TBD | Not started | - |