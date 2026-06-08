# Requirements: Trivial World

**Defined:** 2026-06-08
**Core Value:** Enable in-person social trivia gameplay where the app supports (not replaces) human interaction — the game conductor reads questions aloud and players move together.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Game Setup (SETUP)

- [ ] **SETUP-01**: Game conductor can create a new game session
- [ ] **SETUP-02**: Game conductor can add 1 or more participants to the game
- [ ] **SETUP-03**: Game conductor can set participant names (no accounts required)
- [ ] **SETUP-04**: Game conductor can remove participants before game starts
- [ ] **SETUP-05**: Game conductor can start the game when ready

### Game Conductor Interface (COND)

- [ ] **COND-01**: Game conductor sees questions displayed in large, readable text
- [ ] **COND-02**: Game conductor sees the current category and question number
- [ ] **COND-03**: Game conductor can reveal/hide the answer before reading
- [ ] **COND-04**: Game conductor can mark answer as correct or incorrect
- [ ] **COND-05**: Game conductor sees minimal on-screen info during active play (eyes-up design)

### Game Loop (LOOP)

- [ ] **LOOP-01**: App simulates a die roll with visual animation
- [ ] **LOOP-02**: App displays valid move choices based on die roll result
- [ ] **LOOP-03**: Game conductor can select which participant's turn it is
- [ ] **LOOP-04**: App tracks whose turn it is and advances turn after each question
- [ ] **LOOP-05**: App handles turn cycling through all participants

### Question System (QSTN)

- [ ] **QSTN-01**: App presents questions from 6 categories (see PROJECT.md)
- [ ] **QSTN-02**: App selects question category based on board position
- [ ] **QSTN-03**: App tracks which questions have been asked to avoid repeats
- [ ] **QSTN-04**: App supports category filtering for custom games
- [ ] **QSTN-05**: Questions are stored locally (offline-first, no network dependency)

### Scoring (SCOR)

- [x] **SCOR-01**: App tracks each participant's score and wedge collection
- [x] **SCOR-02**: App awards category wedge when participant answers correctly on category space
- [x] **SCOR-03**: App detects win condition (all 6 wedges + center)
- [ ] **SCOR-04**: App displays final scores and winner at game end

### State Management (STAT)

- [ ] **STAT-01**: App persists game state to local storage
- [ ] **STAT-02**: App can resume interrupted game from where it left off
- [ ] **STAT-03**: Game conductor can pause and resume game
- [ ] **STAT-04**: App handles app background/foreground transitions gracefully

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Content Management (CONT)

- **CONT-01**: Game conductor can create custom question sets
- **CONT-02**: Game conductor can import question sets from external source
- **CONT-03**: App supports question difficulty levels
- **CONT-04**: App shows question count per category

### Online Features (ONLN)

- **ONLN-01**: Participants can join game remotely via shareable link
- **ONLN-02**: Game state syncs across devices in real-time
- **ONLN-03**: Participants have individual scoreboards on their devices

### User Accounts (ACCT)

- **ACCT-01**: Users can create accounts to track game history
- **ACCT-02**: Users can view past game results and statistics
- **ACCT-03**: Users can save favorite question sets

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Online multiplayer (remote play) | Initial version is in-person only — breaks core social value |
| User accounts/authentication | No player profiles for v1 — friction kills social gameplay |
| AI-generated questions | Questions are manually curated initially — quality over quantity |
| Real-time leaderboards | Not needed for in-person play — adds complexity without value |
| In-app purchases | Free-to-play model not planned for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1: Game Setup & Conductor Interface | Pending |
| SETUP-02 | Phase 1: Game Setup & Conductor Interface | Pending |
| SETUP-03 | Phase 1: Game Setup & Conductor Interface | Pending |
| SETUP-04 | Phase 1: Game Setup & Conductor Interface | Pending |
| SETUP-05 | Phase 1: Game Setup & Conductor Interface | Pending |
| COND-01 | Phase 1: Game Setup & Conductor Interface | Pending |
| COND-02 | Phase 1: Game Setup & Conductor Interface | Pending |
| COND-03 | Phase 1: Game Setup & Conductor Interface | Pending |
| COND-04 | Phase 1: Game Setup & Conductor Interface | Pending |
| COND-05 | Phase 1: Game Setup & Conductor Interface | Pending |
| LOOP-01 | Phase 2: Game Loop & Turn Management | Pending |
| LOOP-02 | Phase 2: Game Loop & Turn Management | Pending |
| LOOP-03 | Phase 2: Game Loop & Turn Management | Pending |
| LOOP-04 | Phase 2: Game Loop & Turn Management | Pending |
| LOOP-05 | Phase 2: Game Loop & Turn Management | Pending |
| QSTN-01 | Phase 3: Question System | Pending |
| QSTN-02 | Phase 3: Question System | Pending |
| QSTN-03 | Phase 3: Question System | Pending |
| QSTN-04 | Phase 3: Question System | Pending |
| QSTN-05 | Phase 3: Question System | Pending |
| SCOR-01 | Phase 4: Scoring & Win Condition | Complete |
| SCOR-02 | Phase 4: Scoring & Win Condition | Complete |
| SCOR-03 | Phase 4: Scoring & Win Condition | Complete |
| SCOR-04 | Phase 4: Scoring & Win Condition | Pending |
| STAT-01 | Phase 5: State Persistence | Pending |
| STAT-02 | Phase 5: State Persistence | Pending |
| STAT-03 | Phase 5: State Persistence | Pending |
| STAT-04 | Phase 5: State Persistence | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-08*
*Last updated: 2026-06-08 after roadmap creation*