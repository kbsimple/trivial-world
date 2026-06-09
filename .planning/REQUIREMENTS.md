# Requirements: Trivial World

**Defined:** 2026-06-08
**Core Value:** Enable in-person social trivia gameplay where the app supports (not replaces) human interaction — the game conductor reads questions aloud and players move together.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Game Setup (SETUP)

- [x] **SETUP-01**: Game conductor can create a new game session
- [x] **SETUP-02**: Game conductor can add 1 or more participants to the game
- [x] **SETUP-03**: Game conductor can set participant names (no accounts required)
- [x] **SETUP-04**: Game conductor can remove participants before game starts
- [x] **SETUP-05**: Game conductor can start the game when ready

### Game Conductor Interface (COND)

- [x] **COND-01**: Game conductor sees questions displayed in large, readable text
- [x] **COND-02**: Game conductor sees the current category and question number
- [x] **COND-03**: Game conductor can reveal/hide the answer before reading
- [x] **COND-04**: Game conductor can mark answer as correct or incorrect
- [x] **COND-05**: Game conductor sees minimal on-screen info during active play (eyes-up design)

### Game Loop (LOOP)

- [x] **LOOP-01**: App simulates a die roll with visual animation
- [x] **LOOP-02**: App displays valid move choices based on die roll result
- [x] **LOOP-03**: Game conductor can select which participant's turn it is
- [x] **LOOP-04**: App tracks whose turn it is and advances turn after each question
- [x] **LOOP-05**: App handles turn cycling through all participants

### Question System (QSTN)

- [x] **QSTN-01**: App presents questions from 6 categories (see PROJECT.md)
- [x] **QSTN-02**: App selects question category based on board position
- [x] **QSTN-03**: App tracks which questions have been asked to avoid repeats
- [x] **QSTN-04**: App supports category filtering for custom games
- [x] **QSTN-05**: Questions are stored locally (offline-first, no network dependency)

### Scoring (SCOR)

- [x] **SCOR-01**: App tracks each participant's score and wedge collection
- [x] **SCOR-02**: App awards category wedge when participant answers correctly on category space
- [x] **SCOR-03**: App detects win condition (all 6 wedges + center)
- [x] **SCOR-04**: App displays final scores and winner at game end

### State Management (STAT)

- [x] **STAT-01**: App persists game state to local storage
- [x] **STAT-02**: App can resume interrupted game from where it left off
- [x] **STAT-03**: Game conductor can pause and resume game
- [x] **STAT-04**: App handles app background/foreground transitions gracefully

## v2.0 Requirements: Question Packs & Game Configuration

**Milestone:** Complete
**Completed:** 2026-06-08

### Question Pack Data Structure (PACK)

- [x] **PACK-01**: Define QuestionPack schema with Zod including categories, questions, metadata, and version field
- [x] **PACK-02**: Create TypeScript types from Zod schemas for shared use between mobile and web apps
- [x] **PACK-03**: Add JSON Schema export for validation in non-TypeScript environments
- [x] **PACK-04**: Create WatermelonDB tables for offline pack caching (question_packs, questions)
- [x] **PACK-05**: Migrate existing hardcoded questions (6 categories, 120 questions) to database

### AI Question Generation (AI)

- [x] **AI-01**: Generate trivia questions from topic + category + guidance using LLM
- [x] **AI-02**: Generate questions from source material (movies, books, TV shows, sports seasons)
- [x] **AI-03**: Implement multi-model fact-checking pipeline for quality validation
- [x] **AI-04**: Calculate quality score for generated questions (confidence, distractor quality)
- [x] **AI-05**: Build human review UI for editing and approving generated questions before publishing

### Game Configuration (CONF)

- [x] **CONF-01**: Pack selection UI in game setup showing available packs with metadata
- [x] **CONF-02**: Game settings including time limits per question, difficulty levels, and game variants
- [x] **CONF-03**: Category filtering allowing conductors to enable/disable specific categories within a pack
- [x] **CONF-04**: Pack details view showing category distribution, question count, and difficulty breakdown

### Cloud Infrastructure (CLOUD)

- [x] **CLOUD-01**: Deploy pack files and generator web app on Netlify
- [x] **CLOUD-02**: Build pack download service with checksum verification for integrity
- [x] **CLOUD-03**: Track pack versions for update notifications and migration handling

## v3.0 Requirements: Web Deployment

**Milestone:** Active
**Added:** 2026-06-09

### Infrastructure (NETL)

- [ ] **NETL-01**: Both apps deploy automatically from main branch via GitHub sync
- [ ] **NETL-02**: SPA redirects configured for deep linking (all routes redirect to index.html)
- [ ] **NETL-03**: Two separate Netlify sites (game and generator deploy independently)

### Game Web App (WEBG)

- [x] **WEBG-01**: Game renders in web browser via Expo static export
- [ ] **WEBG-02**: Session storage persists game state during browser session (no IndexedDB)
- [x] **WEBG-03**: Native modules (haptics, orientation) degrade gracefully on web
- [ ] **WEBG-04**: Visual parity between mobile and web (React Native Web CSS adjustments)

### Generator Web App (GEN)

- [ ] **GEN-01**: Generator accessible as static web app on Netlify
- [ ] **GEN-02**: Existing Next.js static export works without modification

### PWA Manifest (PWA)

- [ ] **PWA-01**: PWA manifest with required icons (192px, 512px)
- [ ] **PWA-02**: HTTPS enforced (Netlify provides)
- [ ] **PWA-03**: Add to Home Screen works on Android/iOS

## v4+ Future Requirements

Deferred to future milestones. Tracked but not in current milestone.

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

### Pack Marketplace (MKT)

- **MKT-01**: Cloud pack repository (central marketplace for packs)
- **MKT-02**: Pack discovery and sharing
- **MKT-03**: Pack ownership and user accounts

### Offline Web (OFFW)

- **OFFW-01**: IndexedDB persistence for offline-first web game
- **OFFW-02**: Service worker with shell caching
- **OFFW-03**: Background sync for pack updates

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Online multiplayer (remote play) | Initial version is in-person only — breaks core social value |
| User accounts/authentication | No player profiles for v1 — friction kills social gameplay |
| Real-time leaderboards | Not needed for in-person play — adds complexity without value |
| In-app purchases | Free-to-play model not planned for v1 |
| Cloud AI for generation | Dev-only Ollama for v3.0 (D-01) |
| IndexedDB persistence | Session-only storage for v3.0 (D-02) |
| Service worker caching | Shell-only caching deferred for v4.0 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.0 Requirements (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1: Game Setup & Conductor Interface | Complete |
| SETUP-02 | Phase 1: Game Setup & Conductor Interface | Complete |
| SETUP-03 | Phase 1: Game Setup & Conductor Interface | Complete |
| SETUP-04 | Phase 1: Game Setup & Conductor Interface | Complete |
| SETUP-05 | Phase 1: Game Setup & Conductor Interface | Complete |
| COND-01 | Phase 1: Game Setup & Conductor Interface | Complete |
| COND-02 | Phase 1: Game Setup & Conductor Interface | Complete |
| COND-03 | Phase 1: Game Setup & Conductor Interface | Complete |
| COND-04 | Phase 1: Game Setup & Conductor Interface | Complete |
| COND-05 | Phase 1: Game Setup & Conductor Interface | Complete |
| LOOP-01 | Phase 2: Game Loop & Turn Management | Complete |
| LOOP-02 | Phase 2: Game Loop & Turn Management | Complete |
| LOOP-03 | Phase 2: Game Loop & Turn Management | Complete |
| LOOP-04 | Phase 2: Game Loop & Turn Management | Complete |
| LOOP-05 | Phase 2: Game Loop & Turn Management | Complete |
| QSTN-01 | Phase 3: Question System | Complete |
| QSTN-02 | Phase 3: Question System | Complete |
| QSTN-03 | Phase 3: Question System | Complete |
| QSTN-04 | Phase 3: Question System | Complete |
| QSTN-05 | Phase 3: Question System | Complete |
| SCOR-01 | Phase 4: Scoring & Win Condition | Complete |
| SCOR-02 | Phase 4: Scoring & Win Condition | Complete |
| SCOR-03 | Phase 4: Scoring & Win Condition | Complete |
| SCOR-04 | Phase 4: Scoring & Win Condition | Complete |
| STAT-01 | Phase 5: State Persistence | Complete |
| STAT-02 | Phase 5: State Persistence | Complete |
| STAT-03 | Phase 5: State Persistence | Complete |
| STAT-04 | Phase 5: State Persistence | Complete |

### v2.0 Requirements (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| PACK-01 | Phase 6: Question Pack Structure | Complete |
| PACK-02 | Phase 6: Question Pack Structure | Complete |
| PACK-03 | Phase 6: Question Pack Structure | Complete |
| PACK-04 | Phase 6: Question Pack Structure | Complete |
| PACK-05 | Phase 6: Question Pack Structure | Complete |
| AI-01 | Phase 7: Question Generator Web App | Complete |
| AI-02 | Phase 7: Question Generator Web App | Complete |
| AI-03 | Phase 7: Question Generator Web App | Complete |
| AI-04 | Phase 7: Question Generator Web App | Complete |
| AI-05 | Phase 7: Question Generator Web App | Complete |
| CONF-01 | Phase 8: Game Configuration | Complete |
| CONF-02 | Phase 8: Game Configuration | Complete |
| CONF-03 | Phase 8: Game Configuration | Complete |
| CONF-04 | Phase 8: Game Configuration | Complete |
| CLOUD-01 | Phase 7: Question Generator Web App | Complete |
| CLOUD-02 | Phase 8: Game Configuration | Complete |
| CLOUD-03 | Phase 8: Game Configuration | Complete |

### v3.0 Requirements (In Progress)

| Requirement | Phase | Status |
|-------------|-------|--------|
| WEBG-01 | Phase 9: Mobile Web Export | Complete |
| WEBG-02 | Phase 9: Mobile Web Export | Pending |
| WEBG-03 | Phase 9: Mobile Web Export | Complete |
| WEBG-04 | Phase 9: Mobile Web Export | Pending |
| GEN-01 | Phase 10: Netlify Deployment | Pending |
| GEN-02 | Phase 10: Netlify Deployment | Pending |
| NETL-01 | Phase 10: Netlify Deployment | Pending |
| NETL-02 | Phase 10: Netlify Deployment | Pending |
| NETL-03 | Phase 10: Netlify Deployment | Pending |
| PWA-01 | Phase 11: PWA Manifest | Pending |
| PWA-02 | Phase 10: Netlify Deployment | Pending |
| PWA-03 | Phase 11: PWA Manifest | Pending |

**Coverage:**
- v1.0 requirements: 28 total (Complete)
- v2.0 requirements: 17 total (Complete)
- v3.0 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---

*Requirements defined: 2026-06-08*
*Last updated: 2026-06-09 for v3.0 milestone*